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
  ): Promise<ParticipantRecord> {
    return this.repo.create(data);
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

  async getByEmail(email: string): Promise<ParticipantRecord | null> {
    return this.repo.findByEmail(email);
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    return this.repo.deleteParticipant(id);
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

  async adminCreateParticipant(data: {
    fullName: string;
    email: string;
    phone?: string;
    homeDistrict?: string;
    homeClubName?: string;
    password: string;
    rotaryId?: string;
    participantType?: string;
  }): Promise<ParticipantRecord> {
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash(data.password, 12);
    return this.repo.createWithPassword({
      ...data,
      passwordHash,
    });
  }

  async adminResetPassword(id: string, password: string): Promise<ParticipantRecord> {
    await this.getById(id);
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash(password, 12);
    return this.repo.updatePassword(id, passwordHash);
  }

  async adminToggleActive(id: string, isActive: boolean): Promise<ParticipantRecord> {
    await this.getById(id);
    return this.repo.toggleActive(id, isActive);
  }

  async getStats() {
    return this.repo.countStats();
  }
}
