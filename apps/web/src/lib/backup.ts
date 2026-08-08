import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { formatBackupFilename, isValidBackupFilename } from './backup-validation.ts';

const execPromise = promisify(exec);

export interface BackupResult {
  success: boolean;
  filePath?: string;
  filename?: string;
  sizeBytes?: number;
  uploadedToS3: boolean;
  error?: string;
}

export type BackupFileInfo = {
  filename: string;
  sizeBytes: number;
  createdAt: string;
};

export function getBackupDirectory(): string {
  const backupDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

export function listLocalBackups(): BackupFileInfo[] {
  const backupDir = getBackupDirectory();
  return fs
    .readdirSync(backupDir)
    .filter((name) => isValidBackupFilename(name))
    .map((filename) => {
      const filePath = path.join(backupDir, filename);
      const stat = fs.statSync(filePath);
      return {
        filename,
        sizeBytes: stat.size,
        createdAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function parseDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  return {
    username: url.username,
    password: decodeURIComponent(url.password),
    host: url.hostname,
    port: url.port || '5432',
    database: url.pathname.replace(/^\//, '').split('?')[0] ?? '',
  };
}

function shellEnv(password: string) {
  return {
    ...process.env,
    PGPASSWORD: password,
    PATH: `${process.env.PATH}:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin`,
  };
}

async function isDockerContainerRunning(containerName: string): Promise<boolean> {
  try {
    const env = shellEnv('');
    const { stdout } = await execPromise(`docker ps -q -f name=${containerName}`, { env });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

export async function runDatabaseBackup(): Promise<BackupResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return { success: false, uploadedToS3: false, error: 'DATABASE_URL environment variable is not defined.' };
  }

  const backupDir = getBackupDirectory();
  const filename = formatBackupFilename();
  const filePath = path.join(backupDir, filename);

  try {
    const { username, password, host, port, database } = parseDatabaseUrl(databaseUrl);
    const env = shellEnv(password);

    const containerName = 'corgi_postgres';
    const useDocker =
      (host === '127.0.0.1' || host === 'localhost') && (await isDockerContainerRunning(containerName));

    if (useDocker) {
      console.log(`Starting pg_dump inside Docker container [${containerName}]...`);
      const command = `docker exec -i -e PGPASSWORD="${password}" ${containerName} pg_dump -h 127.0.0.1 -U ${username} -F c -b ${database} > "${filePath}"`;
      await execPromise(command, { env });
    } else {
      console.log(`Starting local pg_dump on host for database ${database} on ${host}:${port}...`);
      const command = `pg_dump -h ${host} -p ${port} -U ${username} -F c -b -v -f "${filePath}" "${database}"`;
      await execPromise(command, { env });
    }

    if (!fs.existsSync(filePath)) {
      throw new Error('pg_dump completed but output file was not found.');
    }

    const stats = fs.statSync(filePath);
    console.log(`Backup completed successfully: ${filePath} (${stats.size} bytes)`);

    let uploadedToS3 = false;
    const s3Bucket = process.env.BACKUP_S3_BUCKET;
    const s3AccessKey = process.env.BACKUP_S3_ACCESS_KEY;
    const s3SecretKey = process.env.BACKUP_S3_SECRET_KEY;
    const s3Endpoint = process.env.BACKUP_S3_ENDPOINT;

    if (s3Bucket && s3AccessKey && s3SecretKey) {
      console.log(`Uploading backup ${filename} to S3/R2 bucket ${s3Bucket}...`);
      try {
        const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
        const s3 = new S3Client({
          region: process.env.BACKUP_S3_REGION || 'auto',
          endpoint: s3Endpoint || undefined,
          credentials: {
            accessKeyId: s3AccessKey,
            secretAccessKey: s3SecretKey,
          },
        });

        const fileBuffer = fs.readFileSync(filePath);
        await s3.send(
          new PutObjectCommand({
            Bucket: s3Bucket,
            Key: `backups/${filename}`,
            Body: fileBuffer,
          })
        );

        uploadedToS3 = true;
        console.log(`Successfully uploaded ${filename} to S3/R2.`);
      } catch (s3Error: unknown) {
        const msg = s3Error instanceof Error ? s3Error.message : String(s3Error);
        console.warn('S3 upload failed, but local backup file was preserved:', msg);
      }
    }

    return {
      success: true,
      filePath,
      filename,
      sizeBytes: stats.size,
      uploadedToS3,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error performing database backup:', error);
    return {
      success: false,
      uploadedToS3: false,
      error: message,
    };
  }
}

export async function runDatabaseRestore(filePath: string): Promise<{ success: boolean; error?: string }> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return { success: false, error: 'DATABASE_URL is not defined.' };
  }
  if (!fs.existsSync(filePath)) {
    return { success: false, error: 'Backup file not found.' };
  }

  try {
    const { username, password, host, port, database } = parseDatabaseUrl(databaseUrl);
    const env = shellEnv(password);
    const containerName = 'corgi_postgres';
    const useDocker =
      (host === '127.0.0.1' || host === 'localhost') && (await isDockerContainerRunning(containerName));

    if (useDocker) {
      const command = `docker exec -i -e PGPASSWORD="${password}" ${containerName} pg_restore -h 127.0.0.1 -U ${username} -d ${database} --clean --if-exists < "${filePath}"`;
      await execPromise(command, { env });
    } else {
      const command = `pg_restore -h ${host} -p ${port} -U ${username} -d ${database} --clean --if-exists -v "${filePath}"`;
      await execPromise(command, { env });
    }

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export function resolveBackupPath(filename: string): string | null {
  if (!isValidBackupFilename(filename)) return null;
  const filePath = path.join(getBackupDirectory(), filename);
  if (!fs.existsSync(filePath)) return null;
  return filePath;
}
