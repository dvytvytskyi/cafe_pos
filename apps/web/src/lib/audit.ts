export interface AuditEntry {
  id: string;
  timestamp: Date;
  action: 'shift_open' | 'shift_close' | 'cash_adjustment' | 'order_completed' | 'order_cancelled' | 'invoice_generated';
  details: any;
  prevHash: string;
  hash: string;
}

const computeHash = (dataStr: string, prevHash: string): string => {
  const combined = dataStr + prevHash;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

export const getAuditLogs = (): AuditEntry[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('corgi_audit_trail');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed.map((e: any) => ({
        ...e,
        timestamp: new Date(e.timestamp)
      }));
    } catch (e) {
      console.error("Failed to parse audit trail", e);
    }
  }
  return [];
};

export const logAuditEvent = (
  action: AuditEntry['action'],
  details: any
): AuditEntry => {
  const logs = getAuditLogs();
  const lastEntry = logs[logs.length - 1];
  const prevHash = lastEntry ? lastEntry.hash : '0000000000000000';
  
  const timestamp = new Date();
  const id = `AUD-${timestamp.getTime()}-${Math.floor(Math.random() * 1000)}`;
  
  const dataStr = JSON.stringify({ id, action, details, timestamp });
  const hash = computeHash(dataStr, prevHash);
  
  const newEntry: AuditEntry = {
    id,
    timestamp,
    action,
    details,
    prevHash,
    hash
  };
  
  const updatedLogs = [...logs, newEntry];
  if (typeof window !== 'undefined') {
    localStorage.setItem('corgi_audit_trail', JSON.stringify(updatedLogs));
  }
  
  return newEntry;
};
