import { escapeHtml } from './html-escape';
import type { NotificationTemplate } from './template.types';

function otpOf(data: Record<string, unknown>): string {
  const value = data.otp;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

export const otpTemplate: NotificationTemplate = {
  subject(data) {
    return `Your Rotaract District 3011 code is ${otpOf(data)}`;
  },
  html(data) {
    const otp = escapeHtml(otpOf(data));
    return `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 18px;">Rotaract District 3011</h1>
        <hr style="border: none; border-top: 3px solid #D81B60;" />
        <p style="font-size: 32px; font-family: monospace; letter-spacing: 6px;">${otp}</p>
        <p>Do not share this code with anyone.</p>
      </div>
    `.trim();
  },
  text(data) {
    const otp = otpOf(data);
    return [
      'Rotaract District 3011',
      '',
      `Your code: ${otp}`,
      '',
      'Do not share this code with anyone.',
    ].join('\n');
  },
  push(data) {
    return {
      title: 'Rotaract District 3011',
      body: `Your code is ${otpOf(data)}`,
      url: '/',
    };
  },
};
