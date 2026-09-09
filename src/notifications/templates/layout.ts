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

export function renderHtml(body: EmailBody): string {
  const paragraphs = body.paragraphs
    .map(
      (p) =>
        `<p style="margin: 0 0 16px; font-size: 15px; line-height: 1.65; color: #D1D5DB;">${escapeHtml(p)}</p>`,
    )
    .join('');

  const facts = (body.facts ?? []).filter(([, value]) => value !== '');
  const factList = facts.length
    ? `
      <div style="margin: 20px 0; padding: 16px 20px; background-color: #1A1D2D; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; border-collapse: collapse;">
          ${facts
            .map(
              ([label, value]) =>
                `<tr>
                  <td style="padding: 6px 12px 6px 0; color: #9CA3AF; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; vertical-align: top; width: 35%;">${escapeHtml(label)}</td>
                  <td style="padding: 6px 0; color: #FFFFFF; font-weight: 600; font-size: 14px; vertical-align: top;">${escapeHtml(value)}</td>
                </tr>`,
            )
            .join('')}
        </table>
      </div>
    `
    : '';

  const cta = body.cta
    ? `
      <div style="margin: 28px 0 12px; text-align: center;">
        <a href="${escapeHtml(body.cta.url)}" style="background: linear-gradient(135deg, #D81B60 0%, #C21350 100%); background-color: #D81B60; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 10px; text-decoration: none; display: inline-block; box-shadow: 0 8px 24px rgba(216, 27, 96, 0.35);">
          <!--[if mso]><i style="letter-spacing: 25px; mso-font-width: -100%; mso-text-raise: 30pt">&nbsp;</i><![endif]-->
          <span style="color: #FFFFFF;">${escapeHtml(body.cta.label)}</span>
          <!--[if mso]><i style="letter-spacing: 25px; mso-font-width: -100%">&nbsp;</i><![endif]-->
        </a>
      </div>
    `
    : '';

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="format-detection" content="telephone=no, address=no, email=no, date=no, url=no">
  <title>${escapeHtml(body.heading)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; padding: 10px !important; }
      .email-card { border-radius: 16px !important; }
      .email-inner { padding: 24px 18px !important; }
      .email-heading { font-size: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #0A0B10; color: #E5E7EB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="background-color: #0A0B10; background: #0A0B10 radial-gradient(circle at 50% 0%, #220D1A 0%, #0A0B10 70%); width: 100%; padding: 40px 10px;">
    <!-- Main Email Container -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 580px; margin: 0 auto; width: 100%;">
      <tr>
        <td>
          <!-- Glassmorphic Card -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="email-card" style="background-color: #141724; background: rgba(20, 23, 36, 0.90); border: 1px solid rgba(255, 255, 255, 0.12); border-top: 2px solid #D81B60; border-radius: 20px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(216, 27, 96, 0.12); overflow: hidden; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);">
            <!-- Card Header -->
            <tr>
              <td style="padding: 28px 32px 20px 32px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
                <!-- District Branding Badge -->
                <div style="display: inline-block; padding: 6px 14px; background-color: #24111D; background: rgba(216, 27, 96, 0.14); border: 1px solid rgba(216, 27, 96, 0.35); border-radius: 999px; margin-bottom: 8px;">
                  <span style="color: #F0407F; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">
                    Rotaract District 3011
                  </span>
                </div>
                <div style="color: #9CA3AF; font-size: 13px; font-weight: 500; letter-spacing: 0.5px;">
                  R.I. District 3011 &bull; 2026-27
                </div>
              </td>
            </tr>

            <!-- Card Body Content -->
            <tr>
              <td class="email-inner" style="padding: 32px;">
                <h1 class="email-heading" style="margin: 0 0 20px; font-size: 22px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.4px; line-height: 1.35;">
                  ${escapeHtml(body.heading)}
                </h1>
                ${paragraphs}
                ${factList}
                ${cta}
              </td>
            </tr>

            <!-- Card Footer -->
            <tr>
              <td style="padding: 22px 32px; background-color: #0E101A; background: rgba(0, 0, 0, 0.25); border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
                <p style="margin: 0 0 8px; font-size: 13px; color: #9CA3AF;">
                  Official District Portal: <a href="https://rotaract3011.org" style="color: #F0407F; text-decoration: none; font-weight: 600;">rotaract3011.org</a>
                </p>
                <p style="margin: 0; font-size: 11px; color: #6B7280; line-height: 1.5;">
                  &copy; 2026-27 Rotaract District 3011. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
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
