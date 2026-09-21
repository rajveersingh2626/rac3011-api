export const REPORT_SUBMITTED_EVENT = 'report.submitted';
export const REPORT_QUERIED_EVENT = 'report.queried';
export const REPORT_RESET_EVENT = 'report.reset';
export const REPORT_DELETED_EVENT = 'report.deleted';

export interface ReportSubmittedEvent {
  reportId: string;
  clubId: string;
  ryYear: number;
  month: string;
  schemaVersion: number;
  submittedById: string;
  submittedAt: string;
  filedOnTime: boolean | null;
}

export interface ReportQueriedEvent {
  reportId: string;
  queryId?: string;
  clubId: string;
  askedById: string;
  question: string;
}

export interface ReportResetEvent {
  reportId: string;
  clubId: string;
  ryYear: number;
  month: string;
  resetById: string;
  reason?: string;
}

export interface ReportDeletedEvent {
  reportId: string;
  clubId: string;
  ryYear: number;
  month: string;
  deletedById: string;
  reason?: string;
}
