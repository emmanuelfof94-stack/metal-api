import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [projectsInProgress, totalPayments, projects] = await Promise.all([
      this.prisma.project.count({ where: { status: { in: ['IN_PRODUCTION', 'QUOTE_ACCEPTED', 'READY_FOR_DELIVERY'] } } }),
      this.prisma.payment.aggregate({ _sum: { amount: true } }),
      this.prisma.project.findMany({
        where: { quotes: { some: { status: 'ACCEPTED' } } },
        include: { quotes: { where: { status: 'ACCEPTED' } }, payments: true },
      }),
    ]);

    const totalSigned = projects.reduce((sum, p) => sum + (p.quotes[0] ? Number(p.quotes[0].totalAmount) : 0), 0);
    const totalCollected = Number(totalPayments._sum.amount ?? 0);
    const totalRemaining = totalSigned - totalCollected;

    return { projectsInProgress, totalSigned, totalCollected, totalRemaining };
  }

  async getAlerts() {
    const now = new Date();
    const alerts: { type: string; message: string; projectId: string; reference: string }[] = [];

    const projects = await this.prisma.project.findMany({
      where: { status: { notIn: ['CLOSED', 'CANCELLED', 'DELIVERED'] } },
      include: {
        quotes: { where: { status: 'ACCEPTED' } },
        payments: true,
      },
    });

    for (const p of projects) {
      const acceptedQuote = p.quotes[0];
      if (!acceptedQuote) continue;

      const totalPaid = p.payments.reduce((s, pay) => s + Number(pay.amount), 0);
      const totalDue = Number(acceptedQuote.totalAmount);
      const depositMin = totalDue * 0.5;

      // Acompte manquant
      if (p.status === 'QUOTE_ACCEPTED' && totalPaid < depositMin) {
        alerts.push({ type: 'deposit', message: `Acompte manquant (${Math.round(totalPaid).toLocaleString('fr-FR')} / ${Math.round(depositMin).toLocaleString('fr-FR')} FCFA)`, projectId: p.id, reference: p.reference });
      }

      // Livraison en retard
      if (p.expectedDeliveryDate && new Date(p.expectedDeliveryDate) < now && p.status !== 'DELIVERED') {
        alerts.push({ type: 'overdue', message: `Livraison dépassée depuis le ${new Date(p.expectedDeliveryDate).toLocaleDateString('fr-FR')}`, projectId: p.id, reference: p.reference });
      }

      // Production sans coût réel saisi
      if (p.status === 'IN_PRODUCTION' && !p.actualCost) {
        alerts.push({ type: 'cost', message: `Coût réel non saisi (projet en production)`, projectId: p.id, reference: p.reference });
      }
    }

    return alerts;
  }

  async getProfitability() {
    const projects = await this.prisma.project.findMany({
      where: { status: { in: ['DELIVERED', 'CLOSED'] } },
      include: { quotes: { where: { status: 'ACCEPTED' }, take: 1 }, payments: true },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    return projects.map(p => {
      const revenue = p.payments.reduce((sum, pay) => sum + Number(pay.amount), 0);
      const estimated = p.quotes[0] ? Number(p.quotes[0].totalAmount) : 0;
      const cost = Number(p.actualCost ?? 0);
      const profit = revenue - cost;
      const margin = cost > 0 ? (profit / cost) * 100 : 0;
      return { id: p.id, reference: p.reference, title: p.title, estimated, revenue, cost, profit, marginPercent: Math.round(margin * 100) / 100 };
    });
  }
}
