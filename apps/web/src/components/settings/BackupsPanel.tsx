'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HardDrive, RefreshCw, Upload, Plus } from 'lucide-react';
import {
  createBackupAsync,
  formatBackupSize,
  listBackupsAsync,
  restoreBackupAsync,
  type BackupFile,
  BackupsApiError,
} from '@/lib/backups';

export default function BackupsPanel() {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const list = await listBackupsAsync();
      setBackups(list);
    } catch (e) {
      setError(e instanceof BackupsApiError ? e.message : 'Failed to load backups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await createBackupAsync();
      if ('queued' in result) {
        setSuccess('Backup job queued');
      } else {
        setSuccess(`Backup created: ${result.filename}`);
      }
      await load();
    } catch (e) {
      setError(e instanceof BackupsApiError ? e.message : 'Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreFile = async (file: File) => {
    setRestoring(true);
    setError(null);
    setSuccess(null);
    try {
      await restoreBackupAsync(file);
      setSuccess(`Restored from ${file.name}`);
    } catch (e) {
      setError(e instanceof BackupsApiError ? e.message : 'Restore failed');
    } finally {
      setRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div data-testid="backups-panel">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <HardDrive size={22} className="text-corgi" />
            Database Backups
          </h2>
          <p className="text-xs text-gray-400 font-semibold mt-1">
            pg_dump snapshots stored locally. Daily job runs at 2:00 AM via BullMQ.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="backups-refresh-btn"
            onClick={() => load()}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-700 flex items-center gap-1.5"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            type="button"
            data-testid="backups-create-btn"
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Plus size={14} /> {creating ? 'Creating…' : 'Create Backup'}
          </button>
        </div>
      </div>

      <div className="mb-6 p-4 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
        <label className="text-xs font-bold text-gray-600 uppercase block mb-2">Restore from file</label>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".dump,.sql"
            data-testid="backups-restore-input"
            disabled={restoring}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleRestoreFile(file).catch(console.error);
            }}
            className="text-xs font-semibold text-gray-700"
          />
          <Upload size={16} className="text-gray-400" />
        </div>
        <p className="text-[11px] text-gray-400 mt-2">Upload a .dump backup file to restore the database.</p>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-4" data-testid="backups-error">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-600 mb-4" data-testid="backups-success">
          {success}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500" data-testid="backups-loading">
          Loading backups…
        </p>
      ) : (
        <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse bg-white">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                <th className="px-4 py-3">Filename</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-700">
              {backups.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                    No backup files yet. Click Create Backup.
                  </td>
                </tr>
              ) : (
                backups.map((b) => (
                  <tr key={b.filename} data-testid={`backup-row-${b.filename}`}>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-900">{b.filename}</td>
                    <td className="px-4 py-3">{formatBackupSize(b.sizeBytes)}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(b.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
