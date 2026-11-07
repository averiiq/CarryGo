/**
 * CaryGoo Bulletproof Email Layout Engine
 * Generates responsive, cross-client HTML & clean plain-text emails.
 */

export interface BaseEmailLayoutOptions {
  preheader?: string;
  title?: string;
  badge?: {
    text: string;
    variant?: 'primary' | 'success' | 'warning' | 'info';
  };
  contentHtml: string;
  primaryCta?: {
    text: string;
    url: string;
  };
  secondaryCta?: {
    text: string;
    url: string;
  };
  footerNote?: string;
  showAppLinks?: boolean;
}

export interface DetailItem {
  label: string;
  value: string;
  highlight?: boolean;
}

/**
 * Renders the full responsive HTML document for CaryGoo emails.
 */
export function renderBaseEmailLayout(options: BaseEmailLayoutOptions): string {
  const {
    preheader = 'CaryGoo - Fast, Secure Peer-to-Peer Parcel Delivery',
    title,
    badge,
    contentHtml,
    primaryCta,
    secondaryCta,
    footerNote,
    showAppLinks = true,
  } = options;

  const badgeColor = badge?.variant === 'success' ? '#008B48'
    : badge?.variant === 'warning' ? '#D97706'
    : badge?.variant === 'info' ? '#0284C7'
    : '#004AAD';

  const badgeBg = badge?.variant === 'success' ? '#E8F8F0'
    : badge?.variant === 'warning' ? '#FEF3C7'
    : badge?.variant === 'info' ? '#E0F2FE'
    : '#EEF5FF';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${title ? `${title} | CaryGoo` : 'CaryGoo Notification'}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; min-width: 100%; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
      .mobile-button { display: block !important; width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; color: #0F172A;">
  <!-- Preheader preview text (hidden from view) -->
  <div style="display: none; font-size: 1px; color: #F8FAFC; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheader} &#847; &zwnj; &nbsp; &#8199; &shy;
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC;">
    <tr>
      <td align="center" style="padding: 24px 12px 36px 12px;">
        <!-- Email Container (600px max width) -->
        <table role="presentation" class="email-container" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%;">
          
          <!-- Header Branding -->
          <tr>
            <td align="center" style="padding: 16px 20px 24px 20px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <span style="display: inline-block; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #004AAD; text-decoration: none;">
                      Cary<span style="color: #008B48;">Goo</span>
                    </span>
                    <div style="font-size: 12px; color: #64748B; font-weight: 500; letter-spacing: 0.5px; margin-top: 3px;">
                      PEER-TO-PEER PARCEL COURIER
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main White Card -->
          <tr>
            <td style="background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04); overflow: hidden;">
              <!-- Colored Top Brand Stripe -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="height: 6px; background: linear-gradient(90deg, #004AAD 0%, #008B48 100%); line-height: 6px; font-size: 6px;">&nbsp;</td>
                </tr>
              </table>

              <!-- Card Content Body -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td class="mobile-padding" style="padding: 36px 36px 32px 36px;">
                    
                    ${badge ? `
                    <!-- Category / Status Badge -->
                    <div style="margin-bottom: 16px;">
                      <span style="display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 5px 12px; border-radius: 20px; border: 1px solid ${badgeColor}33;">
                        ${badge.text}
                      </span>
                    </div>
                    ` : ''}

                    ${title ? `
                    <!-- Title -->
                    <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #0F172A; line-height: 1.35; letter-spacing: -0.3px;">
                      ${title}
                    </h1>
                    ` : ''}

                    <!-- Dynamic Body Content -->
                    <div style="font-size: 15px; line-height: 1.6; color: #334155;">
                      ${contentHtml}
                    </div>

                    ${(primaryCta || secondaryCta) ? `
                    <!-- Action Buttons -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 28px;">
                      <tr>
                        <td align="left">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              ${primaryCta ? `
                              <td class="mobile-button" style="border-radius: 10px; background-color: #004AAD;">
                                <a href="${primaryCta.url}" target="_blank" style="display: inline-block; padding: 13px 26px; font-size: 15px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 10px; border: 1px solid #004AAD; text-align: center;">
                                  ${primaryCta.text} &rarr;
                                </a>
                              </td>
                              ` : ''}

                              ${secondaryCta ? `
                              <td class="mobile-button" style="${primaryCta ? 'padding-left: 12px;' : ''}">
                                <a href="${secondaryCta.url}" target="_blank" style="display: inline-block; padding: 12px 20px; font-size: 14px; font-weight: 600; color: #004AAD; text-decoration: none; border-radius: 10px; border: 1px solid #CBD5E1; text-align: center; background-color: #F8FAFC;">
                                  ${secondaryCta.text}
                                </a>
                              </td>
                              ` : ''}
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    ${footerNote ? `
                    <!-- Contextual Footer Note -->
                    <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #F1F5F9; font-size: 13px; color: #64748B; line-height: 1.5;">
                      ${footerNote}
                    </div>
                    ` : ''}

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${showAppLinks ? `
          <!-- App Download / Help Link Pill -->
          <tr>
            <td align="center" style="padding: 24px 16px 12px 16px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="font-size: 13px; color: #475569;">
                    <span>📲 Access on Android or iOS</span>
                    <span style="margin: 0 8px; color: #CBD5E1;">&bull;</span>
                    <a href="https://carygoo.com/support" target="_blank" style="color: #004AAD; font-weight: 600; text-decoration: none;">Help Center</a>
                    <span style="margin: 0 8px; color: #CBD5E1;">&bull;</span>
                    <a href="https://carygoo.com/safety" target="_blank" style="color: #004AAD; font-weight: 600; text-decoration: none;">Safety Guide</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Global Footer -->
          <tr>
            <td align="center" style="padding: 12px 20px 24px 20px; font-size: 12px; line-height: 1.6; color: #94A3B8;">
              <p style="margin: 0 0 8px 0;">
                You are receiving this email regarding your <strong>CaryGoo</strong> account.<br>
                CaryGoo is operated by Averiq Technologies Private Limited.
              </p>
              <p style="margin: 0 0 8px 0;">
                <a href="https://carygoo.com/terms" style="color: #64748B; text-decoration: underline;">Terms of Service</a>
                &nbsp;|&nbsp;
                <a href="https://carygoo.com/privacy" style="color: #64748B; text-decoration: underline;">Privacy Policy</a>
                &nbsp;|&nbsp;
                <a href="https://carygoo.com/settings/notifications" style="color: #64748B; text-decoration: underline;">Notification Preferences</a>
              </p>
              <p style="margin: 0; color: #CBD5E1; font-size: 11px;">
                &copy; 2026 CaryGoo. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Helper to render key-value details grid inside emails (e.g. tracking, price, cities).
 */
export function renderDetailsGrid(items: DetailItem[]): string {
  if (!items || items.length === 0) return '';

  const rows = items.map((item) => `
    <tr>
      <td style="padding: 8px 12px; font-size: 13px; color: #64748B; border-bottom: 1px solid #F1F5F9; width: 40%;">
        ${item.label}
      </td>
      <td style="padding: 8px 12px; font-size: 13px; font-weight: ${item.highlight ? '700' : '600'}; color: ${item.highlight ? '#008B48' : '#0F172A'}; border-bottom: 1px solid #F1F5F9; text-align: right;">
        ${item.value}
      </td>
    </tr>
  `).join('');

  return `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin: 18px 0; overflow: hidden;">
    ${rows}
  </table>`;
}

/**
 * Helper to render high-contrast OTP or verification code card.
 */
export function renderOtpBox(code: string, subtext?: string): string {
  return `
  <div style="background-color: #EEF5FF; border: 1.5px dashed #004AAD; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
    <div style="font-size: 12px; font-weight: 700; color: #004AAD; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px;">
      One-Time Verification Code
    </div>
    <div style="font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #004AAD; font-family: 'Courier New', Courier, monospace;">
      ${code}
    </div>
    ${subtext ? `
    <div style="font-size: 12px; color: #64748B; margin-top: 8px;">
      ${subtext}
    </div>
    ` : ''}
  </div>`;
}

/**
 * Helper to render an alert callout box (info, success, warning, tip).
 */
export function renderAlertBox(
  textHtml: string,
  variant: 'info' | 'success' | 'warning' | 'security' = 'info',
  iconText?: string
): string {
  const cfg = {
    info: { bg: '#EEF5FF', border: '#BBD8FF', text: '#1E40AF', defaultIcon: 'ℹ️' },
    success: { bg: '#E8F8F0', border: '#A3E7C1', text: '#065F46', defaultIcon: '✅' },
    warning: { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E', defaultIcon: '⚠️' },
    security: { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', defaultIcon: '🛡️' },
  }[variant];

  return `
  <div style="background-color: ${cfg.bg}; border-left: 4px solid ${cfg.border}; border-radius: 8px; padding: 14px 16px; margin: 18px 0; font-size: 14px; line-height: 1.5; color: ${cfg.text};">
    <strong>${iconText || cfg.defaultIcon} Note:</strong> ${textHtml}
  </div>`;
}

/**
 * Simple plain-text converter for accessibility & spam score reduction.
 */
export function convertHtmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n=== $1 ===\n\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<td[^>]*>(.*?)<\/td>/gi, '$1  ')
    .replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&bull;/g, '•')
    .replace(/&rarr;/g, '->')
    .replace(/&copy;/g, '©')
    .replace(/\n\s+\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

