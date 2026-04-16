const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  const filePath = path.resolve(__dirname, 'slides.html');
  await page.goto('file:///' + filePath.replace(/\\/g, '/'), { waitUntil: 'networkidle2', timeout: 30000 });

  // Get total number of slides
  const totalSlides = await page.evaluate(() => document.querySelectorAll('.slide').length);
  console.log(`Total de slides: ${totalSlides}`);

  // Set viewport to Full HD landscape (presentation format)
  await page.setViewport({ width: 1920, height: 1080 });

  const screenshots = [];

  for (let i = 0; i < totalSlides; i++) {
    // Activate the correct slide
    await page.evaluate((slideIndex) => {
      document.querySelectorAll('.slide').forEach((s, idx) => {
        s.classList.remove('active', 'exit-up');
        if (idx === slideIndex) s.classList.add('active');
      });
      document.querySelectorAll('.nav-dot').forEach((d, idx) => {
        d.classList.toggle('active', idx === slideIndex);
      });
    }, i);

    // Wait a bit for any rendering
    await new Promise(r => setTimeout(r, 500));

    // Take screenshot
    const screenshotPath = path.resolve(__dirname, `slide-${i}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    screenshots.push(screenshotPath);
    console.log(`Slide ${i + 1} capturado`);
  }

  // Now create a PDF with all slides as pages
  // Create a temporary HTML that shows all screenshots as pages
  const imagesHtml = screenshots.map((s, i) => `
    <div style="page-break-after: always; width: 1920px; height: 1080px; margin: 0; padding: 0; overflow: hidden;">
      <img src="file:///${s.replace(/\\/g, '/')}" style="width: 1920px; height: 1080px; display: block;">
    </div>
  `).join('');

  const pdfHtml = `<!DOCTYPE html><html><head><style>
    * { margin: 0; padding: 0; }
    @page { size: 1920px 1080px; margin: 0; }
    body { margin: 0; padding: 0; }
  </style></head><body>${imagesHtml}</body></html>`;

  await page.setContent(pdfHtml, { waitUntil: 'load' });

  const pdfPath = path.resolve(__dirname, 'apresentacao-ihub.pdf');
  await page.pdf({
    path: pdfPath,
    width: '1920px',
    height: '1080px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  console.log(`\nPDF gerado: ${pdfPath}`);

  // Cleanup screenshot files
  const fs = require('fs');
  screenshots.forEach(s => fs.unlinkSync(s));

  await browser.close();
})();
