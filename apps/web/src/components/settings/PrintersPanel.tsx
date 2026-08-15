'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Printer as PrinterIcon, Pencil } from 'lucide-react';
import {
  createPrinterAsync,
  deletePrinterAsync,
  getPrintersAsync,
  testPrintAsync,
  updatePrinterAsync,
  type Printer,
  PrinterApiError,
} from '@/lib/printers';
import { PRINTER_TYPES, type PrinterType } from '@/lib/printer-validation';

const TYPE_STYLES: Record<PrinterType, string> = {
  kitchen: 'bg-orange-50 text-orange-700',
  bar: 'bg-blue-50 text-blue-700',
  receipt: 'bg-gray-100 text-gray-700',
};

type FormState = {
  name: string;
  ipAddress: string;
  port: string;
  type: PrinterType;
};

const emptyForm = (): FormState => ({
  name: '',
  ipAddress: '192.168.1.',
  port: '9100',
  type: 'kitchen',
});

export default function PrintersPanel() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await getPrintersAsync();
      setPrinters(list);
    } catch (e) {
      setError(e instanceof PrinterApiError ? e.message : 'Failed to load printers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleAdd = async () => {
    setFormError(null);
    setSaving(true);
    try {
      const port = Number.parseInt(form.port, 10);
      const created = await createPrinterAsync({
        name: form.name,
        ipAddress: form.ipAddress,
        port,
        type: form.type,
        locationId: 'default',
      });
      setPrinters((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setFormOpen(false);
      setForm(emptyForm());
      setToast(`Printer "${created.name}" added`);
    } catch (e) {
      setFormError(e instanceof PrinterApiError ? e.message : 'Failed to add printer');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingPrinter) return;
    setFormError(null);
    setSaving(true);
    try {
      const port = Number.parseInt(form.port, 10);
      const updated = await updatePrinterAsync(editingPrinter.id, {
        name: form.name,
        ipAddress: form.ipAddress,
        port,
        type: form.type,
      });
      setPrinters((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)).sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingPrinter(null);
      setForm(emptyForm());
      setToast(`Printer "${updated.name}" updated`);
    } catch (e) {
      setFormError(e instanceof PrinterApiError ? e.message : 'Failed to update printer');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (printer: Printer) => {
    setEditingPrinter(printer);
    setForm({
      name: printer.name,
      ipAddress: printer.ipAddress,
      port: String(printer.port),
      type: printer.type,
    });
    setFormError(null);
  };

  const handleDelete = async (printer: Printer) => {
    if (!confirm(`Remove printer ${printer.name}?`)) return;
    try {
      await deletePrinterAsync(printer.id);
      setPrinters((prev) => prev.filter((p) => p.id !== printer.id));
      setToast(`Printer "${printer.name}" removed`);
    } catch (e) {
      setToast(e instanceof PrinterApiError ? e.message : 'Delete failed');
    }
  };

  const handleTest = async (printer: Printer) => {
    setTestingId(printer.id);
    try {
      await testPrintAsync(printer.ipAddress, printer.port);
      setToast(`Test print sent to ${printer.name}`);
    } catch (e) {
      const msg = e instanceof PrinterApiError ? e.message : 'Test print failed';
      setToast(`${printer.name}: ${msg}`);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="max-w-4xl flex flex-col gap-8 mt-2" data-testid="printers-panel">
      {toast && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl shadow-lg"
          data-testid="printers-toast"
        >
          {toast}
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-gray-900">Devices & Printers</h2>
        <p className="text-xs text-gray-400 font-semibold mt-1">
          Manage network receipt, kitchen, and bar printers.
        </p>
      </div>

      <div className="border border-gray-100 rounded-3xl p-6 bg-white shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Network IP Printers</h3>
            <p className="text-[11px] text-gray-400 font-semibold">Stored in database — synced across devices.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setForm(emptyForm());
              setFormError(null);
              setFormOpen(true);
            }}
            data-testid="printers-add-btn"
            className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Add Printer
          </button>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading printers…</p>}
        {error && (
          <p className="text-sm text-red-600" role="alert" data-testid="printers-load-error">
            {error}
          </p>
        )}

        {!loading && !error && printers.length === 0 && (
          <p className="text-sm text-gray-500" data-testid="printers-empty">
            No printers configured.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="printers-grid">
          {printers.map((printer) => (
            <div
              key={printer.id}
              className="border border-gray-100 rounded-2xl p-4 bg-gray-50/30 flex flex-col justify-between min-h-[140px]"
              data-testid={`printer-card-${printer.id}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${TYPE_STYLES[printer.type]}`}
                  >
                    {printer.type}
                  </span>
                  <PrinterIcon size={14} className="text-gray-400" />
                </div>
                <h4 className="font-bold text-gray-900 text-sm truncate" data-testid="printer-card-name">
                  {printer.name}
                </h4>
                <p className="text-[11px] text-gray-400 font-mono mt-1" data-testid="printer-card-ip">
                  {printer.ipAddress}:{printer.port}
                </p>
              </div>

              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100/60">
                <button
                  type="button"
                  disabled={testingId === printer.id}
                  onClick={() => handleTest(printer)}
                  data-testid={`printer-test-${printer.id}`}
                  className="flex-1 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {testingId === printer.id ? 'Testing…' : 'Test Print'}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(printer)}
                  data-testid={`printer-edit-${printer.id}`}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(printer)}
                  data-testid={`printer-delete-${printer.id}`}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {(formOpen || editingPrinter) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          data-testid="printer-form-modal"
        >
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">{editingPrinter ? 'Edit Printer' : 'Add Printer'}</h3>
            {formError && (
              <p className="text-sm text-red-600" role="alert">
                {formError}
              </p>
            )}
            <label className="block">
              <span className="text-xs font-bold text-gray-500">Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                data-testid="printer-form-name"
                className="mt-1 w-full h-10 px-3 border border-gray-200 rounded-xl text-sm"
                placeholder="Kitchen Printer"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-gray-500">IPv4 Address</span>
              <input
                value={form.ipAddress}
                onChange={(e) => setForm((f) => ({ ...f, ipAddress: e.target.value }))}
                data-testid="printer-form-ip"
                className="mt-1 w-full h-10 px-3 border border-gray-200 rounded-xl text-sm font-mono"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-gray-500">Port</span>
              <input
                value={form.port}
                onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}
                data-testid="printer-form-port"
                className="mt-1 w-full h-10 px-3 border border-gray-200 rounded-xl text-sm font-mono"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-gray-500">Type</span>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as PrinterType }))}
                data-testid="printer-form-type"
                className="mt-1 w-full h-10 px-3 border border-gray-200 rounded-xl text-sm"
              >
                {PRINTER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => (editingPrinter ? handleUpdate() : handleAdd())}
                data-testid="printer-form-save"
                className="flex-1 h-10 bg-gray-900 text-white rounded-xl text-sm font-bold disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  setEditingPrinter(null);
                  setForm(emptyForm());
                }}
                data-testid="printer-form-cancel"
                className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
