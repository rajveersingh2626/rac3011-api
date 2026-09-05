import type { TemplateKey } from '../notification.port';
import { escapeHtml } from './html-escape';
import type { NotificationTemplate } from './template.types';

function titleCase(key: TemplateKey): string {
  const words = key.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function genericTemplate(key: TemplateKey): NotificationTemplate {
  const subject = `Rotaract District 3011: ${titleCase(key)}`;
  return {
    subject: () => subject,
    html(data) {
      const rows = Object.entries(data)
        .map(([k, v]) => `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</li>`)
        .join('');
      return `<div><h1>${escapeHtml(subject)}</h1><ul>${rows}</ul></div>`;
    },
    text(data) {
      const lines = Object.entries(data).map(([k, v]) => `${k}: ${String(v)}`);
      return [subject, ...lines].join('\n');
    },
    push: () => ({ title: subject, body: subject, url: '/' }),
  };
}
