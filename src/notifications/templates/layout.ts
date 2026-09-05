import type { TemplateData } from './data';
import { escapeHtml } from './html-escape';
import type { NotificationTemplate } from './template.types';

export type EmailBody = {
  heading: string;
  paragraphs: string[];
  facts?: [string, string][];
  cta?: { label: string; url: string };
};

const BRAND = 'Rotaract District 3011';
const ACCENT = '#D81B60';

export function renderHtml(body: EmailBody): string {
  const paragraphs = body.paragraphs
    .map((p) => `<p style="margin: 0 0 12px; line-height: 1.5;">${escapeHtml(p)}</p>`)
    .join('');
  const facts = (body.facts ?? []).filter(([, value]) => value !== '');
  const factList = facts.length
    ? `<table style="margin: 0 0 16px; font-size: 14px;">${facts
        .map(
          ([label, value]) =>
            `<tr><td style="padding: 2px 12px 2px 0; color: #666;">${escapeHtml(label)}</td>` +
            `<td style="padding: 2px 0;"><strong>${escapeHtml(value)}</strong></td></tr>`,
        )
        .join('')}</table>`
    : '';
  const cta = body.cta
    ? `<p style="margin: 16px 0 0;"><a href="${escapeHtml(body.cta.url)}" ` +
      `style="background: ${ACCENT}; color: #fff; padding: 10px 18px; border-radius: 4px; ` +
      `text-decoration: none; display: inline-block;">${escapeHtml(body.cta.label)}</a></p>`
    : '';
  return `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #222;">
      <h1 style="font-size: 18px; margin: 0 0 4px;">${BRAND}</h1>
      <hr style="border: none; border-top: 3px solid ${ACCENT}; margin: 0 0 16px;" />
      <h2 style="font-size: 20px; margin: 0 0 12px;">${escapeHtml(body.heading)}</h2>
      ${paragraphs}${factList}${cta}
    </div>
  `.trim();
}

export function renderText(body: EmailBody): string {
  const facts = (body.facts ?? []).filter(([, value]) => value !== '');
  const lines = [BRAND, '', body.heading, '', ...body.paragraphs];
  if (facts.length) lines.push('', ...facts.map(([label, value]) => `${label}: ${value}`));
  if (body.cta) lines.push('', `${body.cta.label}: ${body.cta.url}`);
  return lines.join('\n');
}

export type TemplateSpec = {
  subject: (data: TemplateData) => string;
  body: (data: TemplateData) => EmailBody;
  push: (data: TemplateData) => { title: string; body: string; url: string };
};

// Push payloads ride in a limited-size service-worker message, so bodies are truncated.
const PUSH_BODY_MAX = 120;

export function truncate(value: string, max = PUSH_BODY_MAX): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

export function defineTemplate(spec: TemplateSpec): NotificationTemplate {
  return {
    subject: (data) => spec.subject(data),
    html: (data) => renderHtml(spec.body(data)),
    text: (data) => renderText(spec.body(data)),
    push: (data) => {
      const push = spec.push(data);
      return { ...push, body: truncate(push.body) };
    },
  };
}
