/**
 * Escapes text for inclusion in a TwiML XML payload.
 */
function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/**
 * Returns a TwiML SMS reply Twilio can send immediately.
 */
export function twiml(message: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
  return new Response(xml, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

/**
 * Sends an outbound SMS. Logs instead of sending when Twilio env vars are missing.
 */
export async function sendSms(to: string, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const isWhatsapp = to.startsWith("whatsapp:");
  const from = isWhatsapp
    ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER ?? "+14155238886"}`
    : process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) {
    console.log(`[twilio:dry-run] to=${to} body=${body}`);
    return;
  }

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Twilio send failed: ${response.status} ${detail}`);
  }
}
