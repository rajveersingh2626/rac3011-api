export const MEMBER_APPROVED_EVENT = 'member.approved';

export interface MemberApprovedEvent {
  memberId: string;
  userId: string;
  clubId: string;
  approvedById: string;
  approvedAt: string;
}
