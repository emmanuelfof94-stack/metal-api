import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: { id: true, fullName: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, fullName: true, email: true, role: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email déjà utilisé');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { fullName: dto.fullName, email: dto.email, passwordHash, role: dto.role },
      select: { id: true, fullName: true, email: true, role: true, createdAt: true },
    });
  }

  async updateRole(id: string, role: UserRole) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, fullName: true, email: true, role: true },
    });
  }

  async resetPassword(id: string, newPassword: string) {
    await this.findOne(id);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    return this.prisma.user.update({ where: { id }, data: { passwordHash }, select: { id: true } });
  }
}
