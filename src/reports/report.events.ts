export const REPORT_SUBMITTED_EVENT = 'report.submitted';
export const REPORT_QUERIED_EVENT = 'report.queried';

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
  queryId: string;
  clubId: string;
  askedById: string;
  question: string;
}
