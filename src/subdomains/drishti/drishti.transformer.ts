import { env } from '../../config/env';
import { decryptPhone, maskPhone } from './drishti-pii.util';
import type { BeneficiaryRow, SurgeryRow } from './drishti.types';

const day = (d: Date): string => d.toISOString().slice(0, 10);

function surgeryDto(row: SurgeryRow) {
  return {
    id: row.id,
    hospital: row.hospital,
    operatedOn: day(row.operatedOn),
    outcome: row.outcome,
    followupOn: row.followupOn ? day(row.followupOn) : null,
  };
}

export function beneficiaryDto(row: BeneficiaryRow, canSeePii: boolean) {
  let phone: string | null = null;
  if (row.phoneEncrypted) {
    phone = canSeePii
      ? decryptPhone(row.phoneEncrypted, env.DRISHTI_PII_KEY)
      : maskPhone(decryptPhone(row.phoneEncrypted, env.DRISHTI_PII_KEY));
  }
  return {
    id: row.id,
    club: row.club,
    name: row.name,
    age: row.age,
    gender: row.gender,
    phone,
    eye: row.eye,
    screenedOn: day(row.screenedOn),
    campLocation: row.campLocation,
    stage: row.stage,
    notes: row.notes,
    surgeries: row.surgeries.map(surgeryDto),
    createdAt: row.createdAt.toISOString(),
  };
}
