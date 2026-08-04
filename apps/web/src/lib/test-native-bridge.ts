import { CapacitorBridge } from './capacitor-bridge';

// Setup basic global mocks for testing in Node
if (typeof global.window === 'undefined') {
  (global as any).window = {
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  Object.defineProperty(global, 'navigator', {
    value: { onLine: true },
    writable: true,
    configurable: true,
  });
}

async function main() {
  console.log('--- Starting Capacitor Native Plugins Bridge Verification Test ---');

  // 1. Verify Browser Fallback State
  console.log('Verifying browser fallback detection...');
  const isNative = CapacitorBridge.isNative();
  console.log(`CapacitorBridge.isNative(): ${isNative} (Expected: false on host/node environment)`);

  if (isNative) {
    console.error('❌ ERROR: Bridge detected native platform in node environment.');
    process.exit(1);
  }
  console.log('✅ Success: Browser fallback detected correctly.');

  // 2. Test Network Listener Fallback registration
  console.log('Registering network listener...');
  let currentNetworkState: boolean | null = null;
  const listener = await CapacitorBridge.startNetworkListener((connected) => {
    currentNetworkState = connected;
    console.log(`[Test Callback] Network state updated to: ${connected ? 'ONLINE' : 'OFFLINE'}`);
  });

  if (currentNetworkState !== true) {
    console.error(`❌ ERROR: Expected initial network state to be true (from mock), got: ${currentNetworkState}`);
    process.exit(1);
  }
  console.log('✅ Success: Network listener initialized and reported state.');

  // Clean up listener
  listener.remove();

  // 3. Test scanning for Bluetooth printers
  console.log('Scanning for Bluetooth printers...');
  const devices = await CapacitorBridge.scanForBluetoothPrinters();
  console.log('Devices found:', devices);
  
  if (devices.length !== 1 || devices[0].address !== 'MOCK-PRINTER-01') {
    console.error('❌ ERROR: Unexpected browser fallback device list.', devices);
    process.exit(1);
  }
  console.log('✅ Success: Bluetooth printer scanner simulation completed.');

  // 4. Test printing execution
  console.log('Triggering receipt printing...');
  const receiptData = 'CORGI POS RECEIPT\n1x Corgi Latte: $4.50\nTotal: $4.50\nThank you!';
  const printed = await CapacitorBridge.printViaBluetooth('MOCK-PRINTER-01', receiptData);

  if (!printed) {
    console.error('❌ ERROR: Printing command reported failure.');
    process.exit(1);
  }
  console.log('✅ Success: Printing job successfully sent to mock printer.');

  console.log('--- Capacitor Native Plugins Bridge Verification Test Passed ---');
  process.exit(0);
}

main();
