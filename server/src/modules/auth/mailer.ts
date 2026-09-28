import { Resend } from "resend";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

const resend = new Resend(env.RESEND_API_KEY);

export async function sendLoginCodeEmail(
  email: string,
  code: string
): Promise<void> {
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    html: `<p>Your Wine Cellar login code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p><p>It expires in 10 minutes. If you didn't request this, ignore this email.</p>`,
    subject: `${code} is your Wine Cellar login code`,
    text: `Your Wine Cellar login code is ${code}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
    to: email,
  });

  if (error) {
    logger.error({ email, err: error }, "Failed to send login code email");
    throw new Error(`Failed to send login code email: ${error.message}`);
  }
}
