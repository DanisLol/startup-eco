import { jsonSchema, type Schema } from "ai";
import { z } from "zod";

/**
 * Structured-output schemas for the model.
 *
 * Gemini compiles a response schema into a constrained-decoding grammar and
 * rejects anything whose state count is too large ("too many states for
 * serving"). Size bounds, numeric ranges and regex patterns multiply that
 * count fast, and our blueprint schema is deep enough to trip it.
 *
 * So the model gets a shape-only schema: same properties, same required
 * fields, same enums, no value constraints. The strict Zod schema still runs
 * on the response, and anything out of bounds is reported back to the model
 * as a repair instruction.
 */

/** JSON Schema keywords that inflate the decoding grammar without changing shape. */
const CONSTRAINT_KEYWORDS = [
  "minLength",
  "maxLength",
  "pattern",
  "format",
  "minItems",
  "maxItems",
  "uniqueItems",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minProperties",
  "maxProperties",
  "default",
  "$schema",
] as const;

type JsonObject = Record<string, unknown>;

function relax(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(relax);
  if (node === null || typeof node !== "object") return node;

  const out: JsonObject = {};
  for (const [key, value] of Object.entries(node as JsonObject)) {
    if ((CONSTRAINT_KEYWORDS as readonly string[]).includes(key)) continue;
    // Gemini understands anyOf but not oneOf.
    out[key === "oneOf" ? "anyOf" : key] = relax(value);
  }
  return out;
}

/**
 * Shape-only JSON Schema for a Zod schema, safe to hand to a structured-output
 * model. Validate the response with the original Zod schema.
 */
export function modelSchema<T>(schema: z.ZodType<T>): Schema<T> {
  const full = z.toJSONSchema(schema, { io: "input", reused: "inline" });
  return jsonSchema<T>(relax(full) as JsonObject);
}

/** Human-readable Zod issues, phrased as instructions the model can act on. */
export function schemaProblems(error: z.ZodError): string[] {
  return error.issues.slice(0, 20).map((issue) => {
    const path = issue.path.length ? issue.path.join(".") : "(root)";
    return `${path}: ${issue.message}`;
  });
}
