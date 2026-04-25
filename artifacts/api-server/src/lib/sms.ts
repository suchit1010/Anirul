import { logger } from "./logger";

const ACCOUNT_SID = process.env["TWILIO_ACCOUNT_SID"];
const AUTH_TOKEN = process.env["TWILIO_AUTH_TOKEN"];
const FROM_NUMBER = process.env["TWILIO_FROM_NUMBER"];

export async function sendSms(to: string, body: string): Promise<{ ok: boolean; demoCode?: string }> {
  if (ACCOUNT_SID && AUTH_TOKEN && FROM_NUMBER) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
      const params = new URLSearchParams({ To: to, From: FROM_NUMBER, Body: body });
      const auth = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64");
      const r = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      if (!r.ok) {
        const text = await r.text().catch(() => "");
        logger.warn({ status: r.status, text: text.slice(0, 200) }, "twilio send failed");
        return { ok: false };
      }
      return { ok: true };
    } catch (err) {
      logger.error({ err }, "twilio send threw");
      return { ok: false };
    }
  }
  // Demo / dev fallback — surface the OTP in logs and return it for the client
  logger.info({ to, body }, "[DEV SMS] Twilio not configured — printing message");
  const match = body.match(/\b(\d{4,8})\b/);
  return { ok: true, demoCode: match?.[1] };
}

export const smsConfigured = Boolean(ACCOUNT_SID && AUTH_TOKEN && FROM_NUMBER);
