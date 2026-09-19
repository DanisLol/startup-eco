import { extractParentText } from "@/lib/ai/generate";
import { generateOrigin } from "@/lib/app-url";
import { createFamilyAndLesson, getFamilyByPhone } from "@/lib/db";
import { twiml } from "@/lib/twilio";

/**
 * Twilio inbound webhook. Creates the family and lesson rows, kicks off
 * generation in a separate request, and replies immediately so Twilio
 * never sees a timeout.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const phone = String(form.get("From") ?? "");
  const body = String(form.get("Body") ?? "");

  if (!phone || !body.trim()) {
    return twiml("Send a text like: Mia is 7, she loves volcanoes");
  }

  const existing = await getFamilyByPhone(phone);
  const parsed = existing
    ? {
        childName: existing.child_name,
        age: existing.child_age,
        topic: body.trim(),
      }
    : await extractParentText(body);

  const { family, lessonId } = await createFamilyAndLesson(phone, parsed);

  const generateUrl = `${generateOrigin(req)}/api/generate`;
  void fetch(generateUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ lessonId }),
  }).catch((error) => {
    console.error("failed to kick off generation", error);
  });

  return twiml(
    `Got it. Building ${family.child_name}'s lesson now - one minute.`,
  );
}
