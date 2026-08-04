import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execPromise = promisify(exec);

export interface BackupResult {
  success: boolean;
  filePath?: string;
  filename?: string;
  sizeBytes?: number;
  uploadedToS3: boolean;
  error?: string;
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

export async function runDatabaseBackup(): Promise<BackupResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return { success: false, uploadedToS3: false, error: 'DATABASE_URL environment variable is not defined.' };
  }

  // Ensure backup directory exists
  const backupDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `corgi_pos_backup_${timestamp}.sql`;
  const filePath = path.join(backupDir, filename);

  try {
    // Parse DATABASE_URL
    const url = new URL(databaseUrl);
    const username = url.username;
    const password = decodeURIComponent(url.password);
    const host = url.hostname;
    const port = url.port || '5432';
    const database = url.pathname.replace(/^\//, '');

    const env = {
      ...process.env,
      PGPASSWORD: password,
      PATH: `${process.env.PATH}:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin`,
    };

    const containerName = 'corgi_postgres';
    const useDocker = (host === '127.0.0.1' || host === 'localhost') && await isDockerContainerRunning(containerName);

    if (useDocker) {
      console.log(`Starting pg_dump inside Docker container [${containerName}]...`);
      // Run pg_dump inside docker and output stdout to the host file path.
      // Set PGPASSWORD inside the container environment.
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

    // S3/R2 upload integration
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
        await s3.send(new PutObjectCommand({
          Bucket: s3Bucket,
          Key: `backups/${filename}`,
          Body: fileBuffer,
        }));

        uploadedToS3 = true;
        console.log(`Successfully uploaded ${filename} to S3/R2.`);
      } catch (s3Error: any) {
        console.warn('S3 upload failed, but local backup file was preserved:', s3Error.message || s3Error);
      }
    }

    return {
      success: true,
      filePath,
      filename,
      sizeBytes: stats.size,
      uploadedToS3,
    };
  } catch (error: any) {
    console.error('Error performing database backup:', error);
    return {
      success: false,
      uploadedToS3: false,
      error: error.message || String(error),
    };
  }
}
