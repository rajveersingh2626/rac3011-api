import { Injectable, NotFoundException } from '@nestjs/common';
import {
  RideParticipantsRepository,
  type ParticipantListFilter,
  type ParticipantRecord,
} from './ride-participants.repository';
import type { RegisterParticipantInput } from './dto/register-participant.dto';

@Injectable()
export class RideParticipantsService {
  constructor(private readonly repo: RideParticipantsRepository) {}

  async register(
    data: RegisterParticipantInput,
    userId?: string,
  ): Promise<ParticipantRecord> {
    return this.repo.create(data, userId);
  }

  async list(
    filter: ParticipantListFilter,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<{ items: ParticipantRecord[]; total: number }> {
    return this.repo.findMany(filter, page, pageSize);
  }

  async getById(id: string): Promise<ParticipantRecord> {
    const record = await this.repo.findById(id);
    if (!record) {
      throw new NotFoundException(`Participant with ID ${id} not found`);
    }
    return record;
  }

  async updateStatus(
    id: string,
    status: string,
    hostClubId?: string | null,
    hostFamilyName?: string,
    hostFamilyPhone?: string,
  ): Promise<ParticipantRecord> {
    await this.getById(id);
    return this.repo.updateStatus(id, status, hostClubId, hostFamilyName, hostFamilyPhone);
  }

  async getStats() {
    return this.repo.countStats();
  }
}
