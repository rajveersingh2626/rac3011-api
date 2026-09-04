export type EmailProviderName = 'oracle' | 'resend' | 'mailgun' | 'gmail';

export const PROVIDER_ORDER: readonly EmailProviderName[] = [
  'oracle',
  'resend',
  'mailgun',
  'gmail',
];

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  from: string;
};

export interface EmailTransport {
  readonly name: EmailProviderName;
  isConfigured(): boolean;
  send(message: EmailMessage): Promise<void>;
}
