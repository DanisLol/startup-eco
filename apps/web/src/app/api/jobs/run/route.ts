import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runQueuedJobs } from "@/lib/jobs";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Sweeps the job queue. Wire this to Vercel Cron (every minute) or call it
 * manually in development: curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/jobs/run
 */
async function handle(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const secret = env.cronSecret;
  if (secret && auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ran = await runQueuedJobs(5);
  return NextResponse.json({ ran });
}

export const GET = handle;
export const POST = handle;
