import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findTelegramId(telegramId: bigint) {
    return this.prisma.user.findUnique({
      where: { telegramId },
    });
  }

  async existsByTelegramId(telegramId: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { telegramId },
      select: { id: true },
    });
    return !!user;
  }

  async create(telegramId: bigint, name: string) {
    return this.prisma.user.create({
      data: {
        telegramId,
        name,
        categories: {
          create: [
            { name: 'Gastos generales', type: 'gasto', isDefault: true },
            { name: 'Ingresos', type: 'ingreso', isDefault: true },
            { name: 'Ahorros', type: 'ahorro', isDefault: true },
          ],
        },
      },
    });
  }
}
