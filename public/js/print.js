// QR Printing Utilities
export function buildLabelsHTML(items) {
  let labelsHTML = '';
  items.forEach(item => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(item.qrCode)}&format=png`;
    labelsHTML += `
      <div class="label-card">
        <img src="${qrUrl}" alt="${item.qrCode}" class="qr-img" crossorigin="anonymous" />
        <div class="label-info">
          <span class="label-hash">${item.qrCode}</span>
          <span class="label-name">${item.name}</span>
        </div>
      </div>
    `;
  });
  return labelsHTML;
}

export function printSelectedQR(items) {
  if (items.length === 0) return;

  const labelsHTML = buildLabelsHTML(items);

  let iframe = document.getElementById('print-frame');
  if (iframe) iframe.remove();

  iframe = document.createElement('iframe');
  iframe.id = 'print-frame';
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:none;left:-9999px;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html>
    <html>
    <head>
      <title>Cetak QR Label</title>
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Arial, Helvetica, sans-serif;
          background: #fff;
          padding: 10mm;
        }
        .label-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4mm;
        }
        .label-card {
          border: 1.5pt solid #000;
          padding: 3mm;
          display: flex;
          align-items: center;
          gap: 3mm;
          page-break-inside: avoid;
          break-inside: avoid;
          min-height: 24mm;
        }
        .qr-img {
          width: 20mm;
          height: 20mm;
          flex-shrink: 0;
          object-fit: contain;
        }
        .label-info {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 1mm;
          overflow: hidden;
          min-width: 0;
        }
        .label-hash {
          font-family: 'Courier New', Courier, monospace;
          font-weight: bold;
          font-size: 8pt;
          word-break: break-all;
          color: #000;
        }
        .label-name {
          font-size: 7pt;
          color: #333;
          word-break: break-word;
        }
      </style>
    </head>
    <body>
      <div class="label-grid">
        ${labelsHTML}
      </div>
    </body>
    </html>`);
  doc.close();

  const images = doc.querySelectorAll('img');
  let loaded = 0;
  const total = images.length;

  function tryPrint() {
    loaded++;
    if (loaded >= total) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  }

  if (total === 0) {
    iframe.contentWindow.print();
  } else {
    images.forEach(img => {
      if (img.complete) { tryPrint(); }
      else {
        img.onload = tryPrint;
        img.onerror = tryPrint;
      }
    });
  }
}
