import { Injectable, NotFoundException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async generateBonCommande(projectId: string): Promise<Buffer> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { customer: true, quotes: { where: { status: 'ACCEPTED' }, include: { lines: { orderBy: { sortOrder: 'asc' } } } } },
    });
    if (!project) throw new NotFoundException('Projet introuvable');

    const quote = project.quotes[0];
    const fmt = (n: any) => Number(n).toLocaleString('fr-FR') + ' FCFA';
    const dark = '#0F172A';
    const blue = '#1D4ED8';
    const gray = '#64748B';

    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // En-tête
      doc.rect(0, 0, doc.page.width, 90).fill(dark);
      doc.fillColor('white').fontSize(18).font('Helvetica-Bold').text('BON DE COMMANDE / LANCEMENT PRODUCTION', 50, 28);
      doc.fontSize(9).font('Helvetica').fillColor('#94A3B8')
        .text(`Réf: ${project.reference}  |  Émis le: ${new Date().toLocaleDateString('fr-FR')}`, 50, 58);

      // Info client & projet
      doc.fillColor(dark).fontSize(10).font('Helvetica-Bold').text('CLIENT', 50, 110);
      doc.font('Helvetica').fontSize(9).fillColor('#1F2937')
        .text(project.customer.fullName, 50, 125)
        .text(project.customer.phone, 50, 140)
        .text(project.customer.address ?? '', 50, 155);

      doc.font('Helvetica-Bold').fontSize(10).fillColor(dark).text('OUVRAGE', 320, 110);
      doc.font('Helvetica').fontSize(9).fillColor('#1F2937')
        .text(project.title, 320, 125)
        .text(`Type: ${project.type}`, 320, 140)
        .text(`Dim: ${project.widthM ?? '—'}m × ${project.heightM ?? '—'}m  |  Qté: ${project.quantity}`, 320, 155)
        .text(`Livraison souhaitée: ${project.expectedDeliveryDate ? new Date(project.expectedDeliveryDate).toLocaleDateString('fr-FR') : '—'}`, 320, 170);

      doc.moveTo(50, 195).lineTo(doc.page.width - 50, 195).strokeColor('#E2E8F0').lineWidth(1).stroke();

      // Spécifications techniques
      const spec: any = project.specificationJson ?? {};
      let y = 210;
      doc.font('Helvetica-Bold').fontSize(10).fillColor(blue).text('SPÉCIFICATIONS TECHNIQUES', 50, y); y += 18;
      const specs = [
        ['Épaisseur tôle', spec.sheetThicknessMm ? `${spec.sheetThicknessMm} mm` : '—'],
        ['Type de tube', spec.tubeType ?? '—'],
        ['Peinture', spec.paintType ?? '—'],
        ['Serrure', spec.lockType ?? '—'],
        ['Accessoires', Array.isArray(spec.accessories) ? spec.accessories.join(', ') : '—'],
        ['Notes', spec.customNotes ?? '—'],
      ];
      doc.font('Helvetica').fontSize(9).fillColor('#1F2937');
      for (const [k, v] of specs) {
        doc.font('Helvetica-Bold').text(k + ' :', 60, y, { continued: true }).font('Helvetica').text('  ' + v);
        y += 16;
      }

      // Lignes de matières (si devis accepté)
      if (quote) {
        y += 10;
        doc.font('Helvetica-Bold').fontSize(10).fillColor(blue).text('LISTE DES MATÉRIAUX (depuis devis accepté)', 50, y); y += 16;
        doc.rect(50, y, doc.page.width - 100, 18).fill('#F1F5F9');
        doc.font('Helvetica-Bold').fontSize(8).fillColor(gray)
          .text('Désignation', 55, y + 4).text('Unité', 290, y + 4).text('Quantité', 350, y + 4, { width: 80, align: 'right' });
        y += 22;

        const matLines = quote.lines.filter((l: any) => l.category === 'material');
        doc.font('Helvetica').fontSize(9).fillColor('#1F2937');
        for (const l of matLines) {
          if (y > 720) { doc.addPage(); y = 50; }
          doc.text(l.label, 55, y, { width: 230 })
            .text(l.unit ?? '', 290, y)
            .text(Number(l.quantity).toLocaleString('fr-FR'), 350, y, { width: 80, align: 'right' });
          y += 16;
        }

        y += 10;
        doc.font('Helvetica-Bold').fontSize(9).fillColor(dark)
          .text(`Montant devis accepté : ${fmt(quote.totalAmount)}`, 50, y);
      }

      // Signature
      y += 40;
      doc.moveTo(50, y).lineTo(250, y).strokeColor('#94A3B8').lineWidth(0.5).stroke();
      doc.moveTo(350, y).lineTo(doc.page.width - 50, y).strokeColor('#94A3B8').lineWidth(0.5).stroke();
      doc.font('Helvetica').fontSize(8).fillColor(gray)
        .text('Signature Responsable Atelier', 50, y + 5)
        .text('Signature Client / Validation', 350, y + 5);

      doc.end();
    });
  }

  async generateBonLivraison(projectId: string): Promise<Buffer> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { customer: true, quotes: { where: { status: 'ACCEPTED' } }, payments: { orderBy: { paidAt: 'asc' } } },
    });
    if (!project) throw new NotFoundException('Projet introuvable');

    const quote = project.quotes[0];
    const totalPaid = project.payments.reduce((s, p) => s + Number(p.amount), 0);
    const totalDue = quote ? Number(quote.totalAmount) : 0;
    const solde = totalDue - totalPaid;
    const fmt = (n: any) => Number(n).toLocaleString('fr-FR') + ' FCFA';
    const dark = '#0F172A';
    const green = '#15803D';
    const gray = '#64748B';

    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      doc.rect(0, 0, doc.page.width, 90).fill(dark);
      doc.fillColor('white').fontSize(18).font('Helvetica-Bold').text('BON DE LIVRAISON', 50, 28);
      doc.fontSize(9).font('Helvetica').fillColor('#94A3B8')
        .text(`Réf: ${project.reference}  |  Date: ${new Date().toLocaleDateString('fr-FR')}`, 50, 58);

      // Client
      doc.fillColor(dark).fontSize(10).font('Helvetica-Bold').text('LIVRÉ À', 50, 110);
      doc.font('Helvetica').fontSize(9).fillColor('#1F2937')
        .text(project.customer.fullName, 50, 125)
        .text(project.customer.phone, 50, 140)
        .text(project.customer.address ?? '', 50, 155);

      doc.font('Helvetica-Bold').fontSize(10).fillColor(dark).text('OUVRAGE LIVRÉ', 320, 110);
      doc.font('Helvetica').fontSize(9).fillColor('#1F2937')
        .text(project.title, 320, 125)
        .text(`Réf: ${project.reference}`, 320, 140)
        .text(`Dim: ${project.widthM ?? '—'}m × ${project.heightM ?? '—'}m`, 320, 155)
        .text(`Quantité: ${project.quantity}`, 320, 170);

      doc.moveTo(50, 195).lineTo(doc.page.width - 50, 195).strokeColor('#E2E8F0').lineWidth(1).stroke();

      // Récapitulatif financier
      let y = 210;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1D4ED8').text('RÉCAPITULATIF FINANCIER', 50, y); y += 20;

      const rows = [
        ['Montant total du devis', fmt(totalDue)],
        ...project.payments.map(p => [`Acompte du ${new Date(p.paidAt).toLocaleDateString('fr-FR')} (${p.method})`, fmt(p.amount)]),
        ['SOLDE RESTANT DÛ', fmt(solde)],
      ];

      for (let i = 0; i < rows.length; i++) {
        const [label, val] = rows[i];
        const isLast = i === rows.length - 1;
        if (isLast) {
          doc.rect(50, y - 2, doc.page.width - 100, 22).fill(solde <= 0 ? '#DCFCE7' : '#FEF3C7');
          doc.font('Helvetica-Bold').fontSize(10)
            .fillColor(solde <= 0 ? green : '#92400E')
            .text(label, 55, y + 2, { width: 300 })
            .text(val, 55, y + 2, { width: doc.page.width - 120, align: 'right' });
          y += 26;
        } else {
          doc.font(i === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor('#1F2937')
            .text(label, 55, y, { width: 300 })
            .text(val, 55, y, { width: doc.page.width - 120, align: 'right' });
          y += 18;
        }
      }

      // Déclaration livraison
      y += 30;
      doc.rect(50, y, doc.page.width - 100, 60).fill('#F8FAFC').stroke('#E2E8F0');
      doc.font('Helvetica').fontSize(9).fillColor(gray)
        .text(
          'Je soussigné(e) certifie avoir reçu en bon état l\'ouvrage désigné ci-dessus, conformément aux spécifications convenues. ' +
          'La livraison est acceptée sans réserve.',
          60, y + 10, { width: doc.page.width - 120 }
        );

      // Signatures
      y += 90;
      doc.moveTo(50, y).lineTo(220, y).strokeColor('#94A3B8').lineWidth(0.5).stroke();
      doc.moveTo(340, y).lineTo(doc.page.width - 50, y).strokeColor('#94A3B8').lineWidth(0.5).stroke();
      doc.font('Helvetica').fontSize(8).fillColor(gray)
        .text('Signature Livreur', 50, y + 5)
        .text('Signature Client (bon pour réception)', 340, y + 5);

      doc.end();
    });
  }
}
