import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findByTelegramId(telegramId: bigint) {
    return this.usersRepository.findTelegramId(telegramId);
  }

  async existsByTelegramId(telegramId: bigint) {
    return this.usersRepository.existsByTelegramId(telegramId);
  }

  async create(telegramId: bigint, name: string) {
    return this.usersRepository.create(telegramId, name);
  }
}
