import { describe, expect, it } from 'vitest';
import type { TemplateKey } from '../notification.port';
import { renderEmail, renderPush, TEMPLATES } from './index';

const ALL_KEYS = Object.keys(TEMPLATES) as TemplateKey[];

describe('notification templates', () => {
  it('covers every template key declared on the port', () => {
    expect(ALL_KEYS).toHaveLength(27);
  });

  it.each(ALL_KEYS)(
    '%s renders a non-empty subject/html/text with no data and does not throw',
    (key) => {
      const rendered = renderEmail(key, {});
      expect(rendered.subject.length).toBeGreaterThan(0);
      expect(rendered.html.length).toBeGreaterThan(0);
      expect(rendered.text.length).toBeGreaterThan(0);
    },
  );

  it.each(ALL_KEYS)('%s renders a push payload within the length budget', (key) => {
    const push = renderPush(key, {});
    expect(push.title.length).toBeGreaterThan(0);
    expect(push.body.length).toBeGreaterThan(0);
    expect(push.body.length).toBeLessThanOrEqual(120);
    expect(push.url.startsWith('/')).toBe(true);
  });

  it.each(ALL_KEYS)('%s leaves no unsubstituted placeholder in the subject', (key) => {
    expect(renderEmail(key, {}).subject).not.toMatch(/undefined|\[object Object\]/);
  });

  it('otp puts the code in the subject, html and text', () => {
    const rendered = renderEmail('otp', { otp: '654321', type: 'sign-in' });
    expect(rendered.subject).toContain('654321');
    expect(rendered.html).toContain('654321');
    expect(rendered.text).toContain('654321');
  });

  it('escapes an html-bearing data value', () => {
    const rendered = renderEmail('member-registered', { fullName: '<script>alert(1)</script>' });
    expect(rendered.html).not.toContain('<script>');
    expect(rendered.html).toContain('&lt;script&gt;');
  });

  it('drops empty fact rows rather than printing blank labels', () => {
    const rendered = renderEmail('member-registered', { fullName: 'Asha' });
    expect(rendered.html).toContain('Asha');
    expect(rendered.html).not.toContain('Email');
  });

  it('renders absolute call-to-action links in email and relative paths in push', () => {
    const rendered = renderEmail('report-queried', { reportId: 'rep_1', question: 'Which club?' });
    expect(rendered.html).toContain('/portal/reports/rep_1');
    expect(rendered.html).toMatch(/href="https?:\/\//);
    expect(renderPush('report-queried', { reportId: 'rep_1' }).url).toBe('/portal/reports/rep_1');
  });

  it('truncates a long push body', () => {
    const push = renderPush('announcement', { title: 'Notice', body: 'x'.repeat(500) });
    expect(push.body).toHaveLength(120);
    expect(push.body.endsWith('…')).toBe(true);
  });

  it('links a published showcase project to its public slug', () => {
    const rendered = renderEmail('showcase-published', { slug: 'tree-drive', title: 'Tree Drive' });
    expect(rendered.html).toContain('/showcase/tree-drive');
    expect(rendered.subject).toContain('Tree Drive');
  });
});
