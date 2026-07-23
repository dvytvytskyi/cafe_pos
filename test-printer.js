const net = require('net');

const printerIp = process.argv[2];
const printerPort = 9100;

if (!printerIp) {
  console.error("Помилка: Вкажіть IP-адресу принтера як аргумент.");
  console.error("Приклад: node test-printer.js 192.168.1.50");
  process.exit(1);
}

const client = new net.Socket();

client.connect(printerPort, printerIp, () => {
  console.log(`Підключено до принтера ${printerIp}:${printerPort}...`);
  
  // ESC/POS команди
  const init = Buffer.from([0x1B, 0x40]); // Ініціалізація
  const alignCenter = Buffer.from([0x1B, 0x61, 0x01]); // Вирівнювання по центру
  const alignLeft = Buffer.from([0x1B, 0x61, 0x00]); // Вирівнювання по лівому краю
  const boldOn = Buffer.from([0x1B, 0x45, 0x01]); // Жирний шрифт увімк.
  const boldOff = Buffer.from([0x1B, 0x45, 0x00]); // Жирний вимк.
  const doubleSize = Buffer.from([0x1D, 0x21, 0x11]); // Подвійний розмір
  const normalSize = Buffer.from([0x1D, 0x21, 0x00]); // Нормальний розмір
  const cutPaper = Buffer.from([0x1D, 0x56, 0x41, 0x00]); // Обрізка паперу

  client.write(init);
  
  // Заголовок
  client.write(alignCenter);
  client.write(doubleSize);
  client.write(boldOn);
  client.write(Buffer.from("CORGI CAFE\n", 'utf8'));
  client.write(boldOff);
  client.write(normalSize);
  client.write(Buffer.from("Test Receipt\n\n", 'utf8'));

  // Товари
  client.write(alignLeft);
  client.write(Buffer.from("1x Espresso                 2.50\n", 'utf8'));
  client.write(Buffer.from("1x Cappuccino               3.50\n", 'utf8'));
  client.write(Buffer.from("--------------------------------\n", 'utf8'));
  
  // Разом
  client.write(alignCenter);
  client.write(boldOn);
  client.write(Buffer.from("TOTAL: 6.00 EUR\n", 'utf8'));
  client.write(boldOff);
  client.write(Buffer.from("\nHave a nice day!\n\n\n\n\n", 'utf8')); 

  // Обрізати
  client.write(cutPaper);

  console.log("Дані успішно відправлені на друк!");
  
  setTimeout(() => {
    client.destroy();
  }, 1000);
});

client.on('error', (err) => {
  console.error("Помилка підключення:", err.message);
});

client.on('close', () => {
  console.log("З'єднання закрито.");
});
