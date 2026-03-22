import env from '#start/env'

const frontendUrl = env.get('FRONTEND_URL') || 'http://localhost:3000'

export function getFrontendUrl(): string {
  return frontendUrl
}

export function ctaButton(url: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 28px 0;"><tr><td align="center">
      <a href="${url}" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%); color: #ffffff; text-align: center; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 12px; box-shadow: 0 4px 16px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.1);">${label}</a>
    </td></tr></table>`
}

export function infoBox(
  text: string,
  bgColor: string,
  borderColor: string,
  textColor: string
): string {
  return `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0;"><tr>
      <td style="border-radius: 12px; padding: 16px 20px; font-size: 14px; line-height: 1.6; background: ${bgColor}; border: 1px solid ${borderColor}; color: ${textColor};">
        ${text}
      </td>
    </tr></table>`
}

export function validityTag(text: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0 0;"><tr><td align="center">
      <span style="display: inline-block; padding: 5px 14px; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.15); border-radius: 20px; font-size: 12px; color: #818cf8; font-weight: 500;">${text}</span>
    </td></tr></table>`
}

export function linkFallback(url: string): string {
  return `<div style="margin: 24px 0 0; padding: 16px 20px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px;">
      <p style="margin: 0 0 6px; font-size: 11px; color: #52525b; text-transform: uppercase; letter-spacing: 1px; font-weight: 500;">Ou copiez ce lien</p>
      <a href="${url}" style="color: #818cf8; text-decoration: none; font-size: 13px; word-break: break-all; line-height: 1.5;">${url}</a>
    </div>`
}

export function wrapHtml(content: string, title: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${title}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0c0a13; color: #fafafa; margin: 0; padding: 0; width: 100%; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%;">
  <div style="padding: 40px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; width: 100%; background: #141118; border: 1px solid rgba(99,102,241,0.12); border-radius: 20px; overflow: hidden; box-shadow: 0 0 80px rgba(99,102,241,0.06), 0 4px 32px rgba(0,0,0,0.4);">

      <!-- Header -->
      <tr><td style="padding: 32px 40px 24px; text-align: center; background: linear-gradient(180deg, rgba(99,102,241,0.08) 0%, transparent 100%);">
        <a href="${frontendUrl}" style="text-decoration: none; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Faktur</a>
      </td></tr>

      <!-- Divider -->
      <tr><td style="padding: 0 40px;">
        <div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(99,102,241,0.25), transparent);"></div>
      </td></tr>

      <!-- Content -->
      <tr><td style="padding: 36px 40px;">
        ${content}
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding: 28px 40px; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.04); text-align: center;">
        <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #52525b; letter-spacing: -0.3px;">Faktur</p>
        <p style="margin: 0; font-size: 12px; color: #3f3f46; line-height: 1.6;">
          Facturation simple et gratuite.<br>
          &copy; ${new Date().getFullYear()} Faktur &mdash; Tous droits r&eacute;serv&eacute;s.
        </p>
      </td></tr>

    </table>
    </td></tr></table>
  </div>
</body>
</html>`
}
