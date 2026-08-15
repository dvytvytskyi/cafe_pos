import { prisma } from './db';
import { guestMenuService } from '../services/guest-menu.service';
import { guestOrderService } from '../services/guest-order.service';
import { guestOtpService } from '../services/guest-otp.service';
import { guestAuthService } from '../services/guest-auth.service';
import { cache } from './cache';

const LOC = 'default';
const TEST_PHONE = '+34600009999';

async function main() {
  console.log('--- Guest API integration test ---');

  try {
    await cache.delete(`active_orders_${LOC}`);

    await prisma.location.upsert({
      where: { id: LOC },
      create: { id: LOC, name: 'Default', address: 'Main' },
      update: {},
    });

    const menu = await guestMenuService.getMenu(LOC, 'en');
    console.log(`✅ Guest menu loaded: ${menu.items.length} items`);

    const search = await guestMenuService.getMenu(LOC, 'en', 'coffee');
    console.log(`✅ Guest menu search: ${search.items.length} matches`);

    const { devCode } = await guestOtpService.requestOtp(TEST_PHONE);
    if (!devCode) throw new Error('Expected devCode in non-production');

    const { token, customerId } = await guestAuthService.verifyOtpAndLogin(TEST_PHONE, devCode);
    if (!token || !customerId) throw new Error('Login failed');
    console.log('✅ Guest OTP + login session');

    const loyalty = await guestAuthService.getLoyalty(customerId);
    assertQr(loyalty.qrCode, customerId);
    console.log('✅ Loyalty QR payload');

    const order = await guestOrderService.createFoodOrder(
      {
        locationId: LOC,
        customerId,
        items: [
          {
            itemType: 'food',
            name: 'Guest Latte',
            quantity: 1,
            unitPrice: 4.5,
          },
        ],
        tipType: 'percent',
        tipValue: 10,
        pointsToSpend: 0,
      },
      customerId
    );

    if (order.source !== 'guest_emenu' || order.status !== 'incoming') {
      throw new Error(`Unexpected order: ${JSON.stringify(order)}`);
    }
    console.log('✅ Guest food order created:', order.id);

    const listed = await guestOrderService.listOrders(customerId);
    if (!listed.some((o) => o.id === order.id)) {
      throw new Error('Order not in guest history');
    }
    console.log('✅ Guest order history');

    await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
    await prisma.guestSession.deleteMany({ where: { customerId } });
    await prisma.guestOtpChallenge.deleteMany({ where: { phone: TEST_PHONE } });
    await prisma.customer.deleteMany({ where: { phone: TEST_PHONE } });

    console.log('✅ Guest integration test passed.');
  } catch (e) {
    console.error('❌ Guest integration test failed:', e);
    await prisma.guestSession.deleteMany({});
    await prisma.guestOtpChallenge.deleteMany({ where: { phone: TEST_PHONE } });
    await prisma.customer.deleteMany({ where: { phone: TEST_PHONE } }).catch(() => {});
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function assertQr(qr: string, customerId: string) {
  if (!qr.includes(customerId)) {
    throw new Error(`QR missing customer id: ${qr}`);
  }
}

main();
