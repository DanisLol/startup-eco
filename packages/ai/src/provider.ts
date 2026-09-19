import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

/**
 * Model routing. Which model handles which task is a function of the
 * account tier and is configuration, not code (plan section "AI layer").
 *
 * - `mock`  : deterministic local generator, no network, no keys.
 * - `google`: Gemini, used for the free tier and for cheap tasks everywhere.
 * - `anthropic`: Claude, used for paid-tier blueprint and code generation.
 *
 * Set AI_PROVIDER=mock to force the mock. Otherwise a task falls back to the
 * mock when its provider key is missing, so local development always works.
 */

export type AiTask = "curriculum" | "blueprint" | "codegen" | "factcheck" | "report";
export type Tier = "free" | "paid";
export type ProviderId = "mock" | "google" | "anthropic";

export interface ModelSpec {
  provider: ProviderId;
  modelId: string;
}

const DEFAULTS: Record<Tier, Record<AiTask, ModelSpec>> = {
  free: {
    curriculum: { provider: "google", modelId: "gemini-3.8-flash" },
    blueprint: { provider: "google", modelId: "gemini-3.8-flash" },
    codegen: { provider: "google", modelId: "gemini-3.8-flash" },
    factcheck: { provider: "google", modelId: "gemini-3.8-flash" },
    report: { provider: "google", modelId: "gemini-3.8-flash" },
  },
  paid: {
    curriculum: { provider: "google", modelId: "gemini-3.8-flash" },
    blueprint: { provider: "anthropic", modelId: "claude-sonnet-4-5" },
    codegen: { provider: "anthropic", modelId: "claude-sonnet-4-5" },
    // Cross-provider check: Gemini reviews what Claude wrote.
    factcheck: { provider: "google", modelId: "gemini-3.8-flash" },
    report: { provider: "google", modelId: "gemini-3.8-flash" },
  },
};

function envOverride(task: AiTask, tier: Tier): ModelSpec | undefined {
  // e.g. AI_MODEL_PAID_CODEGEN=anthropic:claude-opus-4-1
  const raw = process.env[`AI_MODEL_${tier.toUpperCase()}_${task.toUpperCase()}`];
  if (!raw) return undefined;
  const [provider, ...rest] = raw.split(":");
  const modelId = rest.join(":");
  if ((provider === "google" || provider === "anthropic" || provider === "mock") && (modelId || provider === "mock")) {
    return { provider, modelId };
  }
  return undefined;
}

function hasKey(provider: ProviderId): boolean {
  if (provider === "mock") return true;
  if (provider === "google") return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  if (provider === "anthropic") return Boolean(process.env.ANTHROPIC_API_KEY);
  return false;
}

export function resolveModelSpec(task: AiTask, tier: Tier): ModelSpec {
  if (process.env.AI_PROVIDER === "mock") return { provider: "mock", modelId: "mock" };
  const spec = envOverride(task, tier) ?? DEFAULTS[tier][task];
  if (hasKey(spec.provider)) return spec;
  // Degrade gracefully: try the other real provider, then mock.
  const alt: ModelSpec | undefined =
    spec.provider === "anthropic"
      ? DEFAULTS.free[task]
      : spec.provider === "google"
        ? DEFAULTS.paid.codegen
        : undefined;
  if (alt && hasKey(alt.provider)) return alt;
  return { provider: "mock", modelId: "mock" };
}

export type ResolvedModel = { provider: "mock"; modelId: "mock"; model: null } | { provider: "google" | "anthropic"; modelId: string; model: LanguageModel };

export function resolveModel(task: AiTask, tier: Tier): ResolvedModel {
  const spec = resolveModelSpec(task, tier);
  if (spec.provider === "mock") return { provider: "mock", modelId: "mock", model: null };
  if (spec.provider === "anthropic") {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return { provider: "anthropic", modelId: spec.modelId, model: anthropic(spec.modelId) };
  }
  const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
  return { provider: "google", modelId: spec.modelId, model: google(spec.modelId) };
}

export interface UsageRecord {
  provider: ProviderId;
  modelId: string;
  task: AiTask;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}
