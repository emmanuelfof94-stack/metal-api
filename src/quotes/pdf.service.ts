import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');

type FullQuote = {
  lines: any[];
  project: any & { customer: any };
  [key: string]: any;
};

@Injectable()
export class PdfService {
  generate(quote: FullQuote): Promise<Buffer> {
    return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const fmt = (n: any) =>
      Number(n).toLocaleString('fr-FR') + ' FCFA';

    const blue = '#1D4ED8';
    const dark = '#0F172A';
    const gray = '#64748B';

    // En-tête
    doc.rect(0, 0, doc.page.width, 100).fill(dark);
    doc.fillColor('white').fontSize(20).font('Helvetica-Bold')
      .text('MetalGestion', 50, 30);
    doc.fontSize(10).font('Helvetica').fillColor('#94A3B8')
      .text('Construction Métallique', 50, 55);
    doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
      .text(`DEVIS N° ${quote.project.reference}-v${quote.version}`, 50, 72);

    // Infos client + date
    doc.fillColor(dark).font('Helvetica-Bold').fontSize(11)
      .text('CLIENT', 50, 120);
    doc.font('Helvetica').fontSize(10).fillColor('#1F2937')
      .text(quote.project.customer.fullName, 50, 135)
      .text(quote.project.customer.phone, 50, 150)
      .text(quote.project.customer.address || '', 50, 165);

    doc.font('Helvetica-Bold').fontSize(11).fillColor(dark)
      .text('DATE', 380, 120);
    doc.font('Helvetica').fontSize(10).fillColor('#1F2937')
      .text(new Date(quote.createdAt).toLocaleDateString('fr-FR'), 380, 135)
      .text(`Projet : ${quote.project.title}`, 380, 150)
      .text(`Statut : ${quote.status}`, 380, 165);

    // Ligne séparatrice
    doc.moveTo(50, 195).lineTo(doc.page.width - 50, 195).strokeColor('#E2E8F0').lineWidth(1).stroke();

    // En-tête du tableau
    const colX = [50, 260, 340, 420, 490];
    const headers = ['Désignation', 'Unité', 'Qté', 'P.U.', 'Total'];
    doc.rect(50, 205, doc.page.width - 100, 22).fill('#F1F5F9');
    doc.fillColor(gray).font('Helvetica-Bold').fontSize(8);
    headers.forEach((h, i) => {
      const align = i >= 2 ? 'right' : 'left';
      const width = i === 4 ? 60 : i === 0 ? 200 : 75;
      doc.text(h, colX[i], 211, { width, align });
    });

    // Lignes du devis
    let y = 235;
    let lastCategory = '';
    doc.font('Helvetica').fontSize(9).fillColor('#1F2937');

    for (const line of quote.lines) {
      if (line.category !== lastCategory) {
        const catLabel: Record<string, string> = { material: 'MATÉRIAUX', labor: 'MAIN D\'ŒUVRE', other: 'DIVERS' };
        doc.font('Helvetica-Bold').fontSize(8).fillColor(blue)
          .text(catLabel[line.category] ?? line.category.toUpperCase(), 50, y);
        y += 14;
        lastCategory = line.category;
        doc.font('Helvetica').fontSize(9).fillColor('#1F2937');
      }

      if (y > 700) { doc.addPage(); y = 50; }

      doc.text(line.label, colX[0], y, { width: 200 });
      doc.text(line.unit ?? '', colX[1], y, { width: 75 });
      doc.text(Number(line.quantity).toLocaleString('fr-FR'), colX[2], y, { width: 75, align: 'right' });
      doc.text(Number(line.unitPrice).toLocaleString('fr-FR'), colX[3], y, { width: 65, align: 'right' });
      doc.text(Number(line.totalPrice).toLocaleString('fr-FR'), colX[4], y, { width: 60, align: 'right' });
      y += 18;
    }

    // Totaux
    y += 10;
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
    y += 10;

    const totals = [
      ['Sous-total matériaux', fmt(quote.subtotalMaterial)],
      ['Sous-total main d\'œuvre', fmt(quote.subtotalLabor)],
      ['Sous-total divers', fmt(quote.subtotalOther)],
      [`Marge (${quote.marginPercent}%)`, fmt(quote.marginAmount)],
    ];
    doc.font('Helvetica').fontSize(9).fillColor(gray);
    for (const [label, val] of totals) {
      doc.text(label, 350, y, { width: 140 })
        .text(val, 350, y, { width: 195, align: 'right' });
      y += 16;
    }

    y += 4;
    doc.rect(350, y, 200, 26).fill(dark);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(11)
      .text('TOTAL', 355, y + 7, { width: 140 })
      .text(fmt(quote.totalAmount), 355, y + 7, { width: 190, align: 'right' });

    // Pied de page
    const footerY = doc.page.height - 60;
    doc.moveTo(50, footerY).lineTo(doc.page.width - 50, footerY).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(gray)
      .text('Ce devis est valable 30 jours. Un acompte de 50% est requis pour démarrer la production.', 50, footerY + 10, {
        width: doc.page.width - 100, align: 'center',
      });

    doc.end();
    }); // fin Promise
  }
}
