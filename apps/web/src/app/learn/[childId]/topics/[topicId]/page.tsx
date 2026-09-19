import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { randomBytes } from "node:crypto";
import type { ArtifactBlueprint } from "@eco/contracts";
import type { ArtifactRow, ChildRow, TopicRow } from "@eco/db";
import { ArtifactPlayer } from "@/components/artifact-player";
import { ArrowLeft } from "@/components/icons";
import { GeneratingState } from "@/components/generating-state";
import { ensureArtifact, prewarmNextTopic } from "@/lib/jobs";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TopicPlayerPage(props: PageProps<"/learn/[childId]/topics/[topicId]">) {
  const { childId, topicId } = await props.params;
  const supabase = await createClient();

  // RLS-scoped reads double as the ownership check for the service-role calls below.
  const [{ data: child }, { data: topic }] = await Promise.all([
    supabase.from("children").select("*").eq("id", childId).maybeSingle(),
    supabase.from("topics").select("*").eq("id", topicId).maybeSingle(),
  ]);
  if (!child || !topic) notFound();
  const c = child as ChildRow;
  const t = topic as TopicRow;
  const backHref = `/learn/${c.id}`;

  const artifact = await ensureArtifact(t.id);
  const art = artifact as ArtifactRow | null;
  const emoji = art?.blueprint ? (art.blueprint as ArtifactBlueprint).theme?.emoji : undefined;

  if (!art || art.status !== "published" || !art.html) {
    return (
      <div className="py-4">
        <TopicHeader title={t.title} backHref={backHref} />
        <GeneratingState topicId={t.id} emoji="✨" failed={art?.status === "failed" ? art.error : null} />
      </div>
    );
  }

  // One session per open. The nonce lets the host reject spoofed messages.
  const nonce = randomBytes(16).toString("hex");
  const { data: session, error } = await supabase
    .from("artifact_sessions")
    .insert({ child_id: c.id, topic_id: t.id, artifact_id: art.id, nonce })
    .select("id")
    .single();
  if (error || !session) throw new Error(error?.message ?? "could not start session");

  after(() => prewarmNextTopic(t.id));

  return (
    <div className="py-4">
      <TopicHeader title={t.title} backHref={backHref} emoji={emoji} />
      <ArtifactPlayer html={art.html} sessionId={session.id as string} nonce={nonce} topicId={t.id} artifactId={art.id} title={t.title} backHref={backHref} />
    </div>
  );
}

function TopicHeader({ title, backHref, emoji }: { title: string; backHref: string; emoji?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <Link href={backHref} className="btn-secondary btn-sm">
        <ArrowLeft size={15} />
        My topics
      </Link>
      <h1 className="flex min-w-0 items-center gap-2 text-base font-extrabold text-ink-soft">
        {emoji ? (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-card text-lg shadow-soft" aria-hidden>
            {emoji}
          </span>
        ) : null}
        <span className="truncate">{title}</span>
      </h1>
    </div>
  );
}
