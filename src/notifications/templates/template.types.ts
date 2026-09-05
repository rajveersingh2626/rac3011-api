export type NotificationTemplate = {
  subject(data: Record<string, unknown>): string;
  html(data: Record<string, unknown>): string;
  text(data: Record<string, unknown>): string;
  push(data: Record<string, unknown>): { title: string; body: string; url: string };
};
