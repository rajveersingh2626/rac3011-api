import { describe, expect, it } from 'vitest';
import type { TemplateKey } from '../notification.port';
import { renderEmail, TEMPLATES } from './index';

const ALL_KEYS = Object.keys(TEMPLATES) as TemplateKey[];

describe('notification templates', () => {
  it.each(ALL_KEYS)(
    '%s renders a non-empty subject/html/text with no data and does not throw',
    (key) => {
      const rendered = renderEmail(key, {});
      expect(rendered.subject.length).toBeGreaterThan(0);
      expect(rendered.html.length).toBeGreaterThan(0);
      expect(rendered.text.length).toBeGreaterThan(0);
    },
  );

  it('otp puts the code in the subject, html and text', () => {
    const rendered = renderEmail('otp', { otp: '654321', type: 'sign-in' });
    expect(rendered.subject).toContain('654321');
    expect(rendered.html).toContain('654321');
    expect(rendered.text).toContain('654321');
  });

  it('escapes a <script> data value in the generic template html', () => {
    const rendered = renderEmail('member-registered', { note: '<script>alert(1)</script>' });
    expect(rendered.html).not.toContain('<script>');
    expect(rendered.html).toContain('&lt;script&gt;');
  });
});
