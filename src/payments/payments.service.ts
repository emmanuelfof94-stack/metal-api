import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        payments: { orderBy: { paidAt: 'desc' } },
        quotes: { where: { status: 'ACCEPTED' }, take: 1 },
      },
    });
    if (!project) throw new NotFoundException('Projet introuvable');

    const totalPaid = project.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalDue = project.quotes[0] ? Number(project.quotes[0].totalAmount) : 0;

    return {
      payments: project.payments,
      totalPaid,
      totalDue,
      balance: totalDue - totalPaid,
    };
  }

  async create(dto: CreatePaymentDto) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException('Projet introuvable');

    return this.prisma.payment.create({
      data: {
        projectId: dto.projectId,
        amount: dto.amount,
        method: dto.method,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        reference: dto.reference,
        note: dto.note,
      },
    });
  }
}
