import assert from 'assert';

interface OrderItem {
  price: number;
  quantity: number;
}

function calculateOrderTotals(items: OrderItem[], taxRate: number = 0.10) {
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = parseFloat((subtotal * taxRate).toFixed(2));
  const total = parseFloat((subtotal + tax).toFixed(2));
  return { subtotal, tax, total };
}

export async function run() {
  console.log('Running test-unit-orders...');

  const items = [
    { price: 3.50, quantity: 2 }, // €7.00
    { price: 8.00, quantity: 1 }  // €8.00
  ];

  const { subtotal, tax, total } = calculateOrderTotals(items);

  assert.strictEqual(subtotal, 15.00, 'Subtotal sum is incorrect');
  assert.strictEqual(tax, 1.50, 'Tax calculation is incorrect');
  assert.strictEqual(total, 16.50, 'Total sum calculation is incorrect');

  console.log('✅ test-unit-orders passed.');
}
