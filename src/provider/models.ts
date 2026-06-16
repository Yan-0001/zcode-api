/**
 * Model catalog loaded from the reverse-engineered ZCode catalog.
 * @see .omo/plans/zcode-proxy.md Task 3
 * @see _reverse/models_catalog.json
 */
import type { ModelDef } from "./types.js";
import catalog from "../../_reverse/models_catalog.json";

/** Raw catalog shape (subset of fields we care about). */
interface RawModel {
  id: string;
  name: string;
  contextWindow: number;
  maxOutputTokens?: number;
  reasoning?: { defaultLevel?: string; levels?: unknown };
}

interface RawProvider {
  id: string;
  name: string;
  endpoints: { baseURL: string; paths: Record<string, string> };
  defaultKind: string;
  models: RawModel[];
}

interface RawCatalog {
  schemaVersion: string;
  providers: RawProvider[];
}

const RAW = catalog as unknown as RawCatalog;

/**
 * Extract models from the "zai-coding-plan" and "bigmodel-coding-plan" entries.
 * These are the providers that match our proxy use case (coding plan auth).
 * Falls back to "zai" and "bigmodel" if coding-plan variants are absent.
 */
function extractModels(): ModelDef[] {
  const seen = new Set<string>();
  const result: ModelDef[] = [];

  const targetIds = ["zai-coding-plan", "bigmodel-coding-plan", "zai", "bigmodel"];

  for (const targetId of targetIds) {
    const provider = RAW.providers.find((p) => p.id === targetId);
    if (!provider) continue;

    for (const m of provider.models) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);

      const reasoning =
        typeof m.reasoning === "object" &&
        m.reasoning !== null &&
        typeof (m.reasoning as any).defaultLevel === "string";

      result.push({
        id: m.id,
        name: m.name,
        contextWindow: m.contextWindow,
        maxOutputTokens: m.maxOutputTokens,
        reasoning: reasoning || undefined,
      });
    }
  }

  return result;
}

/** All models available across Z.AI / Bigmodel coding plans. */
export const MODELS: ModelDef[] = extractModels();

/** Look up a model by id. Returns `undefined` for unknown models. */
export function getModel(id: string): ModelDef | undefined {
  return MODELS.find((m) => m.id === id);
}

/** All model ids. */
export function listModelIds(): string[] {
  return MODELS.map((m) => m.id);
}
