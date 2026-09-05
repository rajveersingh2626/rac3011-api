import { escapeHtml } from './html-escape';
import type { NotificationTemplate } from './template.types';

function nameOf(data: Record<string, unknown>): string {
  return typeof data.fullName === 'string' && data.fullName.trim() ? data.fullName : 'there';
}

export const passwordResetRequiredTemplate: NotificationTemplate = {
  subject() {
    return 'Set your Rotaract District 3011 password';
  },
  html(data) {
    const name = escapeHtml(nameOf(data));
    return `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 18px;">Rotaract District 3011</h1>
        <hr style="border: none; border-top: 3px solid #D81B60;" />
        <p>Hi ${name},</p>
        <p>Your member profile has been created. Please set a password before you sign in.</p>
      </div>
    `.trim();
  },
  text(data) {
    const name = nameOf(data);
    return [
      'Rotaract District 3011',
      '',
      `Hi ${name},`,
      '',
      'Your member profile has been created. Please set a password before you sign in.',
    ].join('\n');
  },
  push() {
    return {
      title: 'Rotaract District 3011',
      body: 'Set your password to sign in',
      url: '/set-password',
    };
  },
};
