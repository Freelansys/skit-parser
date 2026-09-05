import { describe, expect, it } from "vitest";
import { parseSkit, type ParseResult } from "../src/index.js";
import type { Program } from "../src/index.js";

export function parseOk(source: string): Program {
    const result = parseSkit(source);
    if (result.ast === undefined) {
        throw new Error(`Expected parse to succeed but got errors:\n${formatErrors(result)}`);
    }
    return result.ast;
}

export function parseErr(source: string): ParseResult {
    const result = parseSkit(source);
    if (result.ast !== undefined) {
        throw new Error("Expected parse to fail but it succeeded");
    }
    return result;
}

export function formatErrors(result: ParseResult): string {
    return result.errors
        .map((e) => `  - [${e.code}] ${e.message} (${JSON.stringify(e.location)})`)
        .join("\n");
}

export function flatten(node: unknown): unknown {
    if (Array.isArray(node)) {
        return node.map(flatten);
    }
    if (node !== null && typeof node === "object") {
        const out: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
            if (key === "loc") {
                continue;
            }
            out[key] = flatten(value);
        }
        return out;
    }
    return node;
}

export { describe, expect, it };
