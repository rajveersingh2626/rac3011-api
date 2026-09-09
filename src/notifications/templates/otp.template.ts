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
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="format-detection" content="telephone=no, address=no, email=no, date=no, url=no">
  <title>Verification Code - Rotaract District 3011</title>
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
      .otp-code { font-size: 28px !important; letter-spacing: 6px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #0A0B10; color: #E5E7EB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="background-color: #0A0B10; background: #0A0B10 radial-gradient(circle at 50% 0%, #260E1C 0%, #0A0B10 75%); width: 100%; padding: 40px 10px;">
    <!-- Main Email Container -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 540px; margin: 0 auto; width: 100%;">
      <tr>
        <td>
          <!-- Glassmorphic Card -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="email-card" style="background-color: #141724; background: rgba(20, 23, 36, 0.90); border: 1px solid rgba(255, 255, 255, 0.12); border-top: 3px solid #D81B60; border-radius: 20px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(216, 27, 96, 0.15); overflow: hidden; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);">
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
                  Security Verification &bull; 2026-27
                </div>
              </td>
            </tr>

            <!-- Card Body Content -->
            <tr>
              <td class="email-inner" style="padding: 32px; text-align: center;">
                <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.4px;">
                  Verification Code
                </h1>
                <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #9CA3AF;">
                  Use the one-time security code below to complete your authentication request.
                </p>

                <!-- Glassmorphic OTP Box -->
                <div style="margin: 20px auto; padding: 18px 24px; background-color: #1A1D2D; background: rgba(216, 27, 96, 0.08); border: 1px solid rgba(216, 27, 96, 0.32); border-radius: 14px; max-width: 320px; box-shadow: inset 0 0 20px rgba(216, 27, 96, 0.1);">
                  <div class="otp-code" style="font-size: 34px; font-weight: 700; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; letter-spacing: 8px; color: #FFFFFF; text-shadow: 0 0 12px rgba(240, 64, 127, 0.5);">
                    ${otp}
                  </div>
                </div>

                <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.6; color: #6B7280;">
                  This code expires shortly. If you did not request this verification, you can safely ignore this email.
                </p>
                <p style="margin: 6px 0 0; font-size: 12px; font-weight: 600; color: #F0407F;">
                  &#9888; Do not share this code with anyone.
                </p>
              </td>
            </tr>

            <!-- Card Footer -->
            <tr>
              <td style="padding: 22px 32px; background-color: #0E101A; background: rgba(0, 0, 0, 0.25); border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
                <p style="margin: 0 0 6px; font-size: 12px; color: #9CA3AF;">
                  Official District Portal: <a href="https://rotaract3011.org" style="color: #F0407F; text-decoration: none; font-weight: 600;">rotaract3011.org</a>
                </p>
                <p style="margin: 0; font-size: 11px; color: #4B5563; line-height: 1.5;">
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
