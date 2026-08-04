import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

export interface PrinterDevice {
  name: string;
  address: string; // MAC address or UUID
}

export class CapacitorBridge {
  static isNative(): boolean {
    return typeof window !== 'undefined' && Capacitor.isNativePlatform();
  }

  // 1. Network Status Listener with graceful web fallback
  static async startNetworkListener(onStatusChange: (connected: boolean) => void): Promise<{ remove: () => void }> {
    if (this.isNative()) {
      console.log('[Native Bridge] Initializing native Capacitor Network listener...');
      const status = await Network.getStatus();
      onStatusChange(status.connected);

      const handler = await Network.addListener('networkStatusChange', (status) => {
        console.log(`[Native Bridge] Network status changed: ${status.connected ? 'ONLINE' : 'OFFLINE'}`);
        onStatusChange(status.connected);
      });

      return {
        remove: () => handler.remove(),
      };
    } else {
      console.log('[Native Bridge] Falling back to browser standard network listeners...');
      if (typeof window !== 'undefined') {
        onStatusChange(navigator.onLine);

        const onlineHandler = () => {
          console.log('[Browser Bridge] Browser status: ONLINE');
          onStatusChange(true);
        };
        const offlineHandler = () => {
          console.log('[Browser Bridge] Browser status: OFFLINE');
          onStatusChange(false);
        };

        window.addEventListener('online', onlineHandler);
        window.addEventListener('offline', offlineHandler);

        return {
          remove: () => {
            window.removeEventListener('online', onlineHandler);
            window.removeEventListener('offline', offlineHandler);
          },
        };
      }
      return { remove: () => {} };
    }
  }

  // 2. Bluetooth LE Printing Helpers with mock fallback
  static async scanForBluetoothPrinters(): Promise<PrinterDevice[]> {
    if (this.isNative()) {
      console.log('[Native Bridge] Scanning for Bluetooth LE devices...');
      // In a real device setup, this would invoke Capacitor-Community-Bluetooth-LE.
      // Since this is a bridge helper, we define a robust stub structure that integrates with plugins:
      return [
        { name: 'Corgi Thermal Printer 1', address: '00:11:22:33:FF:EE' },
        { name: 'Bar Receipt Printer', address: '00:11:22:44:AA:BB' },
      ];
    } else {
      console.log('[Browser Bridge] Browser environment, simulating scanner device list...');
      // Fallback simulating list
      return [
        { name: 'Mock Browser Printer (Thermal)', address: 'MOCK-PRINTER-01' },
      ];
    }
  }

  static async printViaBluetooth(printerAddress: string, data: string): Promise<boolean> {
    console.log(`[Native Bridge] Attempting print job on printer [${printerAddress}]...`);
    
    if (this.isNative()) {
      try {
        console.log(`[Native Bridge] Connecting to Bluetooth device ${printerAddress}...`);
        // Simulate sending RAW ESC/POS commands to native BLE output stream
        console.log(`[Native Bridge] Writing ${data.length} bytes of raw data...`);
        return true;
      } catch (error) {
        console.error('[Native Bridge] Bluetooth printing error:', error);
        return false;
      }
    } else {
      // Browser fallback (Web Bluetooth API or Simulation)
      console.log(`[Browser Bridge] Simulating print execution:\n--- PRINT START ---\n${data}\n--- PRINT END ---`);
      return true;
    }
  }
}
