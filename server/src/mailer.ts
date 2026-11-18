import { config } from "./config";

export type OutgoingEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export function isMailConfigured(): boolean {
  return Boolean(config.resendApiKey && config.mailFrom);
}

/**
 * Sends an email through Resend when RESEND_API_KEY and MAIL_FROM are set.
 * Without them, development builds print the message to the server log so the
 * flow can be tested locally; production builds only log a warning.
 */
export async function sendEmail(message: OutgoingEmail): Promise<void> {
  if (!isMailConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[DecoDoc Mail] RESEND_API_KEY / MAIL_FROM are not set. Email was not sent.");
      return;
    }
    console.log(`[DecoDoc Mail] (dev) To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.mailFrom,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Email provider rejected the message (${res.status}). ${detail.slice(0, 200)}`);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function passwordResetEmail(to: string, link: string): OutgoingEmail {
  const safeLink = escapeHtml(link);
  return {
    to,
    subject: "Reset your DecoDoc password",
    text: [
      "Someone asked to reset the password for your DecoDoc account.",
      "",
      `Open this link to choose a new password (valid for 30 minutes):`,
      link,
      "",
      "If this wasn't you, you can ignore this email. Your password stays the same.",
    ].join("\n"),
    html: `<!doctype html>
<html><body style="margin:0;background:#f7f3f1;font-family:Helvetica,Arial,sans-serif;color:#0a0a0a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px">
        <tr><td>
          <p style="margin:0 0 4px;font-size:20px;font-weight:700">Deco<span style="color:#c24e00">Doc</span></p>
          <h1 style="margin:24px 0 12px;font-size:22px">Reset your password</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#6b6f76">Someone asked to reset the password for your DecoDoc account. This link is valid for 30 minutes.</p>
          <a href="${safeLink}" style="display:inline-block;background:#c24e00;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px">Choose a new password</a>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b6f76">If this wasn't you, ignore this email. Your password stays the same.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  };
}
