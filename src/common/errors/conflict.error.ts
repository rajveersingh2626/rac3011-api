import { ConflictException } from '@nestjs/common';

export type ConflictCode =
  'PRIVACY_NOT_ACCEPTED' | 'ALREADY_EXISTS' | 'INVALID_TRANSITION' | 'CAPACITY_FULL' | 'SLOT_TAKEN';

export class CodedConflictException extends ConflictException {
  constructor(code: ConflictCode, message: string) {
    super({ statusCode: 409, error: 'Conflict', code, message });
  }
}
