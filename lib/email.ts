/**
 * Email utility using Resend
 * Set RESEND_API_KEY env var to enable.
 * Falls back to console.log in development.
 */

import { Resend } from "resend";

const FROM_EMAIL = process.env.FROM_EMAIL || "PropertyRush <noreply@propertyrush.net>";

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (_resend) return _resend;
  if (process.env.RESEND_API_KEY) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<boolean> {
  const resend = getResend();

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; font-weight: 800; color: #1e1b4b; margin: 0;">
          Property<span style="color: #7c3aed;">Rush</span>
        </h1>
      </div>
      <h2 style="font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 12px;">Reset your password</h2>
      <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
        We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.
      </p>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 12px; text-decoration: none;">
          Reset Password
        </a>
      </div>
      <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">
        If you didn't request this, you can safely ignore this email. Your password won't change until you click the link above.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #cbd5e1; font-size: 11px; text-align: center;">
        PropertyRush &mdash; The fast property card game
      </p>
    </div>
  `;

  if (!resend) {
    // Dev fallback — log to console
    console.log(`\n[EMAIL] Password reset for ${to}:\n${resetUrl}\n`);
    return true;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Reset your PropertyRush password",
      html,
    });

    if (error) {
      console.error("[Email] Send failed:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Email] Error:", err);
    return false;
  }
}
