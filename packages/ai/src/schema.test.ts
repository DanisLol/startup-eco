import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ArtifactBlueprint, GeneratedCurriculum } from "@eco/contracts";
import { modelSchema, schemaProblems } from "./schema";

/** Keywords that make Gemini reject a response schema as "too many states". */
const BANNED = [
  "minLength",
  "maxLength",
  "pattern",
  "format",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
  "multipleOf",
  "oneOf",
  "$ref",
  "$defs",
];

function raw(schema: ReturnType<typeof modelSchema>): string {
  return JSON.stringify(schema.jsonSchema);
}

describe("modelSchema", () => {
  it.each([
    ["blueprint", ArtifactBlueprint],
    ["curriculum", GeneratedCurriculum],
  ])("strips decoding-grammar constraints from the %s schema", (_name, schema) => {
    const json = raw(modelSchema(schema as z.ZodType));
    for (const keyword of BANNED) expect(json, keyword).not.toContain(`"${keyword}"`);
  });

  it("keeps the shape the model needs: properties, required and enums", () => {
    const json = modelSchema(ArtifactBlueprint).jsonSchema as Record<string, unknown>;
    const props = (json.properties ?? {}) as Record<string, unknown>;
    expect(Object.keys(props)).toEqual(expect.arrayContaining(["title", "theme", "sections", "learningObjectives"]));
    expect(json.required).toEqual(expect.arrayContaining(["title", "sections"]));
    // Section/question discriminators must survive so the model picks a variant.
    expect(raw(modelSchema(ArtifactBlueprint))).toContain("explore");
  });

  it("reports out-of-bounds responses as fixable problems", () => {
    // Shape is right but values violate bounds, which is what the model may now return.
    const parsed = GeneratedCurriculum.safeParse({ title: "x", description: "short", topics: [] });
    expect(parsed.success).toBe(false);
    const problems = schemaProblems(parsed.error!);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.every((p) => p.includes(":"))).toBe(true);
  });
});
