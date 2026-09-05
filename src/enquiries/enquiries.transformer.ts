import type { EnquiryRow } from './enquiries.types';

export function enquiryAdminDto(row: EnquiryRow) {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    email: row.email,
    phone: row.phone,
    organisation: row.organisation,
    message: row.message,
    payload: row.payload,
    routedTo: row.routedTo,
    status: row.status,
    assignedToId: row.assignedToId,
    createdAt: row.createdAt.toISOString(),
  };
}
