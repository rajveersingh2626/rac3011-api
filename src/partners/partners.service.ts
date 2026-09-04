import { Injectable } from '@nestjs/common';
import { PartnersRepository } from './partners.repository';
import type { PartnerRow } from './partners.types';

@Injectable()
export class PartnersService {
  constructor(private readonly repo: PartnersRepository) {}

  list(): Promise<PartnerRow[]> {
    return this.repo.findAll();
  }
}
