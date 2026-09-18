export function generateBespokeRideEmailHtml(title: string, rawBody: string): string {
  const paragraphs = rawBody
    .split('\n\n')
    .filter((p) => p.trim());

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; padding: 12px !important; }
      .email-card { border-width: 2px !important; }
      .email-hero-title { font-size: 24px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FDFBF7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #171515;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FBC02D; border-bottom: 3px solid #171515;">
    <tr>
      <td style="padding: 10px 16px; text-align: center;">
        <span style="font-size: 11px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; color: #171515;">
          DELHI MERI JAAN 2026 &bull; ROTARY INTERNATIONAL DISTRICT 3011 &bull; THE RIDE
        </span>
      </td>
    </tr>
  </table>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FDFBF7; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border: 3px solid #171515; border-radius: 20px; box-shadow: 6px 6px 0px #171515; overflow: hidden;">
          <tr>
            <td style="padding: 24px 24px 18px; text-align: center; background-color: #FDFBF7; border-bottom: 2px solid #171515;">
              <span style="display: inline-block; padding: 4px 14px; background-color: #19539D; border: 2px solid #171515; border-radius: 999px; color: #FFFFFF; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">
                Official RIDE Communication &bull; RID 3011
              </span>
            </td>
          </tr>

          <tr>
            <td style="padding: 28px 28px 24px;">
              <h1 class="email-hero-title" style="margin: 0 0 16px; font-size: 24px; font-weight: 900; line-height: 1.25; text-transform: uppercase; color: #171515; letter-spacing: -0.5px;">
                ${title}
              </h1>

              ${paragraphs.map((p) => `<p style="margin: 0 0 14px; font-size: 14px; line-height: 1.6; color: #374151;">${p.replace(/\n/g, '<br/>')}</p>`).join('')}

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px; padding-top: 16px; border-top: 2px dashed #E5E7EB; text-align: center;">
                <tr>
                  <td style="font-size: 11px; color: #6B7280; line-height: 1.5;">
                    Rotary International District 3011 &bull; Delhi Meri Jaan 2026<br/>
                    Delivered securely via the RIDE Operations Console.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function interpolateTokens(
  template: string,
  data: {
    fullName?: string;
    districtNumber?: string;
    passReference?: string;
    hostClub?: string;
  },
): string {
  let result = template
    .replace(/\{\{\s*(?:name|full_name)\s*\}\}/gi, data.fullName || 'Delegate')
    .replace(/\{\{\s*district_number\s*\}\}/gi, data.districtNumber || '3011')
    .replace(/\{\{\s*pass_reference\s*\}\}/gi, data.passReference || 'DMJ-2026-PASS')
    .replace(/\{\{\s*host_club\s*\}\}/gi, data.hostClub || 'Designated Host Club');

  // Sanitize any remaining unparsed {{...}} placeholders so raw brackets never appear
  return result.replace(/\{\{[^}]+\}\}/g, '').trim();
}
