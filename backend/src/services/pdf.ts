import PDFDocument from 'pdfkit';

export function generateVoucherPDF(voucher: { code: string; price: number; hotspotName?: string; planName?: string; expiresAt?: Date | null; createdAt: Date }) {
  const doc = new PDFDocument({ size: [283, 425], margin: 20 });

  doc.fontSize(18).font('Helvetica-Bold').text('MIKCONNECT', { align: 'center' });
  doc.fontSize(8).font('Helvetica').fillColor('#666').text('Ticket d\'accs WiFi', { align: 'center' });
  doc.moveDown(1);

  doc.roundedRect(30, doc.y, 223, 60, 8).stroke('#ddd');
  doc.fontSize(24).font('Helvetica-Bold').fillColor('#000').text(voucher.code, { align: 'center', width: 223 });

  doc.moveDown(0.3);
  doc.fontSize(8).fillColor('#999').text('Code ticket', { align: 'center' });
  doc.moveDown(1.5);

  const leftX = 40;
  let rowY = doc.y;

  doc.fontSize(9).font('Helvetica-Bold').fillColor('#333');
  doc.text('Montant:', leftX, rowY);
  doc.text('Date expire:', leftX + 110, rowY);
  rowY += 14;
  doc.font('Helvetica').fillColor('#666');
  doc.text(`${voucher.price} XOF`, leftX, rowY);
  doc.text(voucher.expiresAt ? new Date(voucher.expiresAt).toLocaleDateString('fr-FR') : '24h', leftX + 110, rowY);

  rowY += 20;
  if (voucher.hotspotName) {
    doc.font('Helvetica-Bold').fillColor('#333').fontSize(9).text('Hotspot:', leftX, rowY);
    rowY += 12;
    doc.font('Helvetica').fillColor('#666').text(voucher.hotspotName, leftX, rowY);
    rowY += 14;
  }
  if (voucher.planName) {
    doc.font('Helvetica-Bold').fillColor('#333').text('Offre:', leftX, rowY);
    rowY += 12;
    doc.font('Helvetica').fillColor('#666').text(voucher.planName, leftX, rowY);
  }

  doc.moveDown(2);
  doc.fontSize(7).fillColor('#aaa').text(`Imprim le ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}`, { align: 'center' });

  doc.end();
  return doc;
}

export function generateInvoicePDF(transactions: any[], title: string) {
  const doc = new PDFDocument({ margin: 30 });

  doc.fontSize(20).font('Helvetica-Bold').text('MIKCONNECT', { align: 'center' });
  doc.fontSize(10).fillColor('#666').text(title, { align: 'center' });
  doc.moveDown(1.5);

  const tableTop = doc.y;
  const columns = ['Rfrence', 'Montant', 'Mthode', 'Statut', 'Date'];
  const widths = [80, 60, 70, 50, 80];

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#333');
  let x = 30;
  columns.forEach((col, i) => { doc.text(col, x, tableTop, { width: widths[i] }); x += widths[i]; });

  doc.moveTo(30, tableTop + 14).lineTo(550, tableTop + 14).stroke('#ddd');

  let y = tableTop + 20;
  doc.fontSize(8).font('Helvetica').fillColor('#555');
  transactions.forEach((tx: any) => {
    x = 30;
    const row = [tx.reference?.slice(0, 12) || '-', `${tx.amount || 0} XOF`, tx.method || '-', tx.status || '-', tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('fr-FR') : '-'];
    row.forEach((val, i) => { doc.text(val, x, y, { width: widths[i] }); x += widths[i]; });
    y += 16;
    if (y > 700) { doc.addPage(); y = 50; }
  });

  doc.moveDown(1);
  doc.moveTo(30, y + 8).lineTo(550, y + 8).stroke('#ddd');
  const total = transactions.reduce((s: number, t: any) => s + (t.amount || 0), 0);
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#000').text(`Total: ${total} XOF`, { align: 'right' });

  doc.end();
  return doc;
}
