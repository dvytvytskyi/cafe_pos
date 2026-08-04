const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    try {
        console.log('Starting puppeteer...');
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        const htmlPath = path.join(__dirname, 'corgi_pos_implemented_tz.html');
        console.log('Loading HTML file:', htmlPath);
        
        await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
        
        console.log('Generating PDF...');
        await page.pdf({
            path: 'Corgis_1 Stage TT.pdf',
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '20mm',
                bottom: '20mm',
                left: '20mm'
            }
        });
        
        await browser.close();
        console.log('PDF generated successfully!');
    } catch (err) {
        console.error('Error generating PDF:', err);
        process.exit(1);
    }
})();
