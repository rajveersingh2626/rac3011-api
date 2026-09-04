import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthRepository, TrustedDeviceRow } from './auth.repository';

@Injectable()
export class TrustedDevicesService {
  constructor(private readonly repo: AuthRepository) {}

  list(userId: string): Promise<TrustedDeviceRow[]> {
    return this.repo.listTrustedDevices(userId);
  }

  async revoke(userId: string, id: string): Promise<void> {
    const deleted = await this.repo.deleteTrustedDevice(id, userId);
    if (deleted === 0) throw new NotFoundException();
  }
}
