# Pebble — kids learning from a parent text

A parent texts a number saying what their child wants to learn. Pebble generates a roadmap and one playable lesson. The child opens `/join`, types a family code, picks their name, and hops through five steps. Progress is saved. When they tap **I'm done for now**, the parent gets a text about what actually happened.

## Run it

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Demo family code: **MIA4K2** (Mia, volcanoes). That row is seeded in memory when Supabase env vars are missing, and in `seed.sql` for a real database.

## Environment

```
APP_URL                        # public https URL (ngrok or production)
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY      # server only; never prefix with NEXT_PUBLIC_
ANTHROPIC_API_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
```

Without Twilio or Anthropic keys the app still runs: outbound SMS is logged, and lesson generation falls back to the volcano fixture.

## Twilio (trial)

1. Buy a trial number with SMS.
2. Verify every demo phone under Verified Caller IDs. Trial accounts cannot text unverified numbers (error 21608).
3. `ngrok http 3000`, then set the number's "A message comes in" webhook to `https://<subdomain>.ngrok.app/api/sms/inbound`, method POST.
4. Put that same https origin in `APP_URL`. Keep ngrok running; a restart changes the URL and the webhook silently 404s.

Parent text example: `Mia is 7, she loves volcanoes`.

They get an acknowledgement immediately, then a second text with the join code.

## Database

Paste `schema.sql` into the Supabase SQL editor (already applied on the linked project). Access is service-role only. RLS is enabled with no policies so the publishable key cannot read child rows.

The join cookies (`familyId`, `childName`) are plain and unsigned. Sign them before this holds real children.

## Cut on purpose

One inbound SMS path, one generated lesson, join-by-code, progress save, exit debrief. No parent dashboard, no real auth, no webhook signature check, no free-response grading.
