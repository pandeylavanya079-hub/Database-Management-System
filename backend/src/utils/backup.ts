import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pitambara_dms';
const BACKUP_DIR = path.join(__dirname, '../../backups');

export const performBackup = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 1. Create backups directory if it doesn't exist
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `pitambara_backup_${timestamp}`;
    const outputFolder = path.join(BACKUP_DIR, backupFileName);

    // 2. Formulate mongodump command
    // Handles cloud Atlas connections (srv) and local connection strings
    let command = '';
    if (MONGODB_URI.startsWith('mongodb+srv://')) {
      command = `mongodump --uri="${MONGODB_URI}" --out="${outputFolder}" --gzip`;
    } else {
      command = `mongodump --host="127.0.0.1" --port="27017" --db="pitambara_dms" --out="${outputFolder}" --gzip`;
    }

    console.log(`Starting database backup: ${backupFileName}...`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Backup process failed: ${error.message}`);
        return reject(error);
      }

      console.log(`Backup completed successfully! Saved to: ${outputFolder}`);
      
      // Run retention cleanup
      try {
        cleanOldBackups(30); // Keep backups for 30 days
      } catch (cleanErr) {
        console.warn('Warning: Failed to clear older backups:', cleanErr);
      }

      resolve(outputFolder);
    });
  });
};

// Deletes backup folders older than X days
const cleanOldBackups = (retentionDays: number) => {
  if (!fs.existsSync(BACKUP_DIR)) return;

  const thresholdMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(BACKUP_DIR);

  files.forEach((file) => {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory() && stats.birthtimeMs < thresholdMs) {
      console.log(`Removing old backup directory: ${file} (Exceeded retention policy)`);
      fs.rmSync(filePath, { recursive: true, force: true });
    }
  });
};

// Self-execute if run directly
if (require.main === module) {
  performBackup()
    .then((path) => console.log(`SUCCESS: Backup saved to ${path}`))
    .catch((err) => console.error('FAILED: Backup execution error', err));
}
