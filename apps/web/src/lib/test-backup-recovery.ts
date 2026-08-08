import { runDatabaseBackup } from './backup.ts';
import { prisma } from './db.ts';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execPromise = promisify(exec);

function psqlShellQuote(sql: string): string {
  return `'${sql.replace(/'/g, `'\\''`)}'`;
}

async function isDockerContainerRunning(containerName: string): Promise<boolean> {
  try {
    const env = {
      ...process.env,
      PATH: `${process.env.PATH}:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin`,
    };
    const { stdout } = await execPromise(`docker ps -q -f name=${containerName}`, { env });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function main() {
  console.log('--- Starting Database Backup & Recovery Integration Test ---');

  const mainDbUrl = process.env.DATABASE_URL;
  if (!mainDbUrl) {
    console.error('❌ ERROR: DATABASE_URL is not set.');
    process.exit(1);
  }

  const url = new URL(mainDbUrl);
  const password = decodeURIComponent(url.password);
  const host = url.hostname;
  const port = url.port || '5432';
  const username = url.username;

  // Temporary restore database name
  const testDbName = 'corgi_pos_restore_test';
  
  // Construct test database URL
  const testDbUrl = `postgresql://${username}:${url.password}@${host}:${port}/${testDbName}?schema=public`;

  let backupFilePath = '';
  const containerName = 'corgi_postgres';
  let useDocker = false;

  try {
    useDocker = (host === '127.0.0.1' || host === 'localhost') && await isDockerContainerRunning(containerName);

    // 1. Create a dummy location and verify it is in the main DB
    console.log('Creating mock location in main DB to backup...');
    const testLocId = `loc-backup-test-${Date.now().toString().slice(-4)}`;
    const mockLoc = await prisma.location.create({
      data: {
        id: testLocId,
        name: 'Backup Test Location',
        address: 'Backup Road 12',
      },
    });

    // 2. Perform backup
    console.log('Running database backup...');
    const backupResult = await runDatabaseBackup();
    if (!backupResult.success || !backupResult.filePath) {
      console.error('❌ ERROR: Database backup failed.', backupResult.error);
      process.exit(1);
    }
    backupFilePath = backupResult.filePath;
    console.log(`✅ Success: Backup file created at ${backupFilePath}`);

    // 3. Create the temporary restore database in PostgreSQL
    console.log(`Creating test database [${testDbName}]...`);
    const env = {
      ...process.env,
      PGPASSWORD: password,
      PATH: `${process.env.PATH}:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin`,
    };

    if (useDocker) {
      console.log(`Dropping and creating database [${testDbName}] inside Docker container...`);
      const dropCmd = `docker exec -i -e PGPASSWORD="${password}" ${containerName} psql -h 127.0.0.1 -U ${username} -d template1 -c "DROP DATABASE IF EXISTS ${testDbName};"`;
      const createCmd = `docker exec -i -e PGPASSWORD="${password}" ${containerName} psql -h 127.0.0.1 -U ${username} -d template1 -c "CREATE DATABASE ${testDbName};"`;
      await execPromise(dropCmd, { env });
      await execPromise(createCmd, { env });
    } else {
      console.log(`Dropping and creating database [${testDbName}] on local host...`);
      const dropCmd = `psql -h ${host} -p ${port} -U ${username} -d template1 -c "DROP DATABASE IF EXISTS ${testDbName};"`;
      const createCmd = `psql -h ${host} -p ${port} -U ${username} -d template1 -c "CREATE DATABASE ${testDbName};"`;
      await execPromise(dropCmd, { env });
      await execPromise(createCmd, { env });
    }
    console.log(`✅ Success: Test database [${testDbName}] created.`);

    // 4. Restore the backup into the test database
    console.log(`Running pg_restore into [${testDbName}]...`);
    if (useDocker) {
      // Pipe host backup file to pg_restore inside docker container
      const restoreCmd = `docker exec -i -e PGPASSWORD="${password}" ${containerName} pg_restore -h 127.0.0.1 -U ${username} -d ${testDbName} < "${backupFilePath}"`;
      await execPromise(restoreCmd, { env });
    } else {
      const restoreCmd = `pg_restore -h ${host} -p ${port} -U ${username} -d ${testDbName} -v "${backupFilePath}"`;
      await execPromise(restoreCmd, { env });
    }
    console.log('✅ Success: pg_restore execution completed.');

    // 5. Verify restored data via psql (avoids separate Prisma adapter in test script)
    console.log('Verifying restored database integrity...');
    const verifyQuery = `SELECT name FROM "Location" WHERE id = '${testLocId}';`;
    let verifyStdout = '';
    if (useDocker) {
      const verifyCmd = `docker exec -i -e PGPASSWORD="${password}" ${containerName} psql -h 127.0.0.1 -U ${username} -d ${testDbName} -t -c ${psqlShellQuote(verifyQuery)}`;
      verifyStdout = (await execPromise(verifyCmd, { env })).stdout;
    } else {
      const verifyCmd = `psql -h ${host} -p ${port} -U ${username} -d ${testDbName} -t -c ${psqlShellQuote(verifyQuery)}`;
      verifyStdout = (await execPromise(verifyCmd, { env })).stdout;
    }

    if (verifyStdout.includes('Backup Test Location')) {
      console.log('✅ T30.3 Verified database integrity! Mock location restored.');
    } else {
      console.error('❌ ERROR: Mock location not found in restored database.');
      process.exit(1);
    }

    // 6. Clean up temporary database & mock location in main DB
    console.log('Cleaning up mock location in main DB...');
    await prisma.location.delete({ where: { id: testLocId } });

    console.log(`Dropping test database [${testDbName}]...`);
    if (useDocker) {
      await execPromise(`docker exec -i -e PGPASSWORD="${password}" ${containerName} psql -h 127.0.0.1 -U ${username} -d template1 -c "DROP DATABASE IF EXISTS ${testDbName};"`, { env });
    } else {
      await execPromise(`psql -h ${host} -p ${port} -U ${username} -d template1 -c "DROP DATABASE IF EXISTS ${testDbName};"`, { env });
    }
    console.log('✅ Success: Test database dropped.');

    // Remove local backup file
    if (fs.existsSync(backupFilePath)) {
      fs.unlinkSync(backupFilePath);
      console.log('✅ Success: Local backup test file deleted.');
    }

    console.log('--- Database Backup & Recovery Test Completed Successfully ---');
    process.exit(0);
  } catch (error) {
    console.error('Unexpected error during backup/recovery test:', error);
    // Cleanup on failure
    try {
      const env = {
        ...process.env,
        PGPASSWORD: password,
        PATH: `${process.env.PATH}:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin`,
      };
      if (useDocker) {
        await execPromise(`docker exec -i -e PGPASSWORD="${password}" ${containerName} psql -h 127.0.0.1 -U ${username} -d template1 -c "DROP DATABASE IF EXISTS ${testDbName};"`, { env }).catch(() => {});
      } else {
        await execPromise(`psql -h ${host} -p ${port} -U ${username} -d template1 -c "DROP DATABASE IF EXISTS ${testDbName};"`, { env }).catch(() => {});
      }
      if (backupFilePath && fs.existsSync(backupFilePath)) {
        fs.unlinkSync(backupFilePath);
      }
    } catch (e) {}
    process.exit(1);
  }
}

main();
