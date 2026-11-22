import { escapeHtml } from "./transporter";

interface OtpTemplateInput {
  otp: string;
  expiryMinutes: number;
  heading: string;
  intro: string;
  codeLabel: string;
  securityNote: string;
  ignoreNote: string;
}

const BRAND_BLUE = "#3B82F6";
const MUTED = "#6B7280";

export function renderOtpEmail(input: OtpTemplateInput): string {
  const safeOtp = escapeHtml(input.otp);
  const safeExpiry = escapeHtml(String(input.expiryMinutes));

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${input.heading}</title>
  </head>
  <body style="margin:0;padding:24px 16px;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;margin:0 auto;">
      <tr>
        <td style="padding:0 0 28px;">
          <!-- লোগো: অ্যাপের Logo কম্পোনেন্টের হুবহু একই রূপ -->
          <table role="presentation" cellspacing="0" cellpadding="0" style="width:auto;">
            <tr>
              <td style="font-size:24px;line-height:24px;font-weight:800;letter-spacing:-0.6px;padding:0 0 4px;">
                <span style="color:${BRAND_BLUE};">Ru's</span><span>Auth</span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background-color:${BRAND_BLUE};margin-left:4px;vertical-align:2px;"></span>
              </td>
            </tr>
            <tr>
              <td height="2" style="height:2px;font-size:0;line-height:0;background-color:${BRAND_BLUE};border-radius:2px;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:4px 0 0;font-size:12px;line-height:12px;font-weight:500;letter-spacing:0.3px;color:${MUTED};">Safer Than Condoms</td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td>
          <!-- শিরোনাম ও পরিচিতি -->
          <h1 style="margin:0 0 12px;font-size:20px;line-height:1.4;font-weight:700;">${input.heading}</h1>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.7;">${input.intro}</p>

          <!-- OTP কোড -->
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:1.5px;color:${MUTED};">${input.codeLabel}</p>
          <p style="margin:0 0 24px;padding:16px 12px;text-align:center;font-family:'Courier New',Courier,monospace;font-size:32px;line-height:1;font-weight:700;letter-spacing:8px;border:1px solid ${MUTED};border-radius:8px;">${safeOtp}</p>

          <!-- মেয়াদ ও নিরাপত্তার বার্তা -->
          <p style="margin:0 0 12px;font-size:13px;line-height:1.7;">
            This code expires in <strong>${safeExpiry} minutes</strong>. ${input.securityNote}
          </p>
          <p style="margin:0;font-size:13px;line-height:1.7;color:${MUTED};">${input.ignoreNote}</p>
        </td>
      </tr>

      <tr>
        <td style="padding:28px 0 0;font-size:12px;line-height:1.6;color:${MUTED};">
          Sent securely by Ru'sAuth. Automated email, please do not reply.
        </td>
      </tr>
    </table>
  </body>
</html>`;
}