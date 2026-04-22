import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search?: string) {
    return this.prisma.customer.findMany({
      where: search
        ? { OR: [{ fullName: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] }
        : undefined,
      include: { _count: { select: { projects: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        projects: {
          orderBy: { createdAt: 'desc' },
          include: {
            quotes: { where: { status: 'ACCEPTED' }, take: 1 },
            payments: true,
          },
        },
      },
    });
    if (!customer) throw new NotFoundException('Client introuvable');
    return customer;
  }

  create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateCustomerDto>) {
    await this.findOne(id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }
}
