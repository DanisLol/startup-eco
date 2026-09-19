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
 * Sends an outbound SMS and returns a delivery result for the dashboard inbox.
 * Missing credentials remain a safe dry run for local development.
 */
export async function sendSms(to: string, body: string): Promise<{ status: "sent" | "skipped" }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) {
    console.log(`[twilio:dry-run] to=${to} body=${body}`);
    return { status: "skipped" };
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
  return { status: "sent" };
}
