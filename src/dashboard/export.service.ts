import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require('xlsx');
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportProjects(): Promise<Buffer> {
    const projects = await this.prisma.project.findMany({
      include: { customer: true, quotes: { where: { status: 'ACCEPTED' }, take: 1 }, payments: true },
      orderBy: { createdAt: 'desc' },
    });

    const rows = projects.map(p => {
      const q = p.quotes[0];
      const paid = p.payments.reduce((s, pay) => s + Number(pay.amount), 0);
      return {
        'Référence': p.reference,
        'Titre': p.title,
        'Client': p.customer.fullName,
        'Téléphone': p.customer.phone,
        'Type': p.type,
        'Statut': p.status,
        'Largeur (m)': Number(p.widthM ?? 0),
        'Hauteur (m)': Number(p.heightM ?? 0),
        'Surface (m²)': Number(p.areaM2 ?? 0),
        'Quantité': p.quantity,
        'Devis accepté (FCFA)': q ? Number(q.totalAmount) : 0,
        'Marge (%)': q ? Number(q.marginPercent) : 0,
        'Encaissé (FCFA)': paid,
        'Solde (FCFA)': q ? Number(q.totalAmount) - paid : 0,
        'Coût réel (FCFA)': Number(p.actualCost ?? 0),
        'Date création': p.createdAt.toLocaleDateString('fr-FR'),
        'Livraison prévue': p.expectedDeliveryDate ? new Date(p.expectedDeliveryDate).toLocaleDateString('fr-FR') : '',
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Projets');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  async exportPayments(): Promise<Buffer> {
    const payments = await this.prisma.payment.findMany({
      include: { project: { include: { customer: true } } },
      orderBy: { paidAt: 'desc' },
    });

    const rows = payments.map(p => ({
      'Référence projet': p.project.reference,
      'Titre projet': p.project.title,
      'Client': p.project.customer.fullName,
      'Montant (FCFA)': Number(p.amount),
      'Mode paiement': p.method,
      'Référence paiement': p.reference ?? '',
      'Date paiement': new Date(p.paidAt).toLocaleDateString('fr-FR'),
      'Note': p.note ?? '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Paiements');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  async exportRentabilite(): Promise<Buffer> {
    const projects = await this.prisma.project.findMany({
      where: { status: { in: ['DELIVERED', 'CLOSED'] } },
      include: { quotes: { where: { status: 'ACCEPTED' }, take: 1 }, payments: true },
    });

    const rows = projects.map(p => {
      const revenue = p.payments.reduce((s, pay) => s + Number(pay.amount), 0);
      const estimated = p.quotes[0] ? Number(p.quotes[0].totalAmount) : 0;
      const cost = Number(p.actualCost ?? 0);
      const profit = revenue - cost;
      const margin = cost > 0 ? Math.round((profit / cost) * 10000) / 100 : 0;
      return {
        'Référence': p.reference,
        'Titre': p.title,
        'Statut': p.status,
        'Devis (FCFA)': estimated,
        'Encaissé (FCFA)': revenue,
        'Coût réel (FCFA)': cost,
        'Bénéfice (FCFA)': profit,
        'Marge (%)': margin,
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Rentabilité');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
