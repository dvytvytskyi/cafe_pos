import { queue } from './queue';
import { runDatabaseBackup } from './backup';

// Subscribe to backup topic
queue.subscribe('db:backup', async (payload: any) => {
  console.log(`[Backup Worker] Intercepted backup trigger. Payload:`, payload);
  try {
    const result = await runDatabaseBackup();
    console.log(`[Backup Worker] Backup completed. Result:`, result);
  } catch (error) {
    console.error(`[Backup Worker] Backup job failed:`, error);
  }
});

queue.subscribe('verifactu:sync', async (payload: { orderId?: string; fiscalRecordId?: string }) => {
  console.log(`[Veri-Factu Worker] Processing sync job:`, payload);
  try {
    if (payload.orderId) {
      const { fiscalService } = await import('../services/fiscal.service');
      await fiscalService.generateFiscalRecord(payload.orderId);
      console.log(`[Veri-Factu Worker] Fiscal record ensured for order ${payload.orderId}`);
    }
  } catch (error) {
    console.error(`[Veri-Factu Worker] Sync failed:`, error);
  }
});

// Helper function to register the repeatable daily backup
export async function scheduleDailyBackup() {
  console.log('[Backup Worker] Registering repeatable daily backup job (daily at 2:00 AM)...');
  // Daily at 2:00 AM: '0 2 * * *'
  await queue.publishRepeatable('db:backup', { trigger: 'scheduled' }, '0 2 * * *');
}
