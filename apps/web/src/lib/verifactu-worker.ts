import { queue } from './queue';

let registered = false;

export function registerVerifactuWorker() {
  if (registered) return;
  registered = true;

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
}

registerVerifactuWorker();
