const GENERATION_MARKER = "gen:";

/** A `$` or `@` only counts as a generation marker when it is not part of a word and not escaped. */
const GENERATION_MARKER_RE = /(?<![A-Za-z0-9_\\])([$@])([A-Za-z_][A-Za-z0-9_]*)/g;

export interface ExtractedGenerationDirective {
    instruction: string;
    references: string[];
    bindings: string[];
}

function stripCommentDelimiters(content: string): string {
    if (content.startsWith("//")) {
        return content.slice(2);
    }
    if (content.startsWith("/*") && content.endsWith("*/")) {
        return content.slice(2, -2);
    }
    return content;
}

/** Returns the comment body without the host-language delimiters. */
export function commentText(rawComment: string): string {
    return stripCommentDelimiters(rawComment).trim();
}

function normalizeWhitespace(text: string): string {
    return text.replace(/\s+/g, " ").trim();
}

function extractUnique(names: string[]): string[] {
    return [...new Set(names)];
}

/**
 * Classifies and extracts a generation directive from raw comment content
 * (including the host-language delimiters).
 *
 * A comment is a generation directive when its trimmed content begins with
 * the `gen:` marker. The `$identifier` markers introduce bindings, while
 * `@identifier` markers reference existing variables.
 *
 * @returns the extracted directive, or `undefined` for ordinary comments.
 */
export function extractGenerationDirective(
    rawComment: string,
): ExtractedGenerationDirective | undefined {
    const content = stripCommentDelimiters(rawComment);
    const trimmed = content.trimStart();
    if (!trimmed.startsWith(GENERATION_MARKER)) {
        return undefined;
    }

    const rest = trimmed.slice(GENERATION_MARKER.length);
    const instruction = normalizeWhitespace(rest);

    const references: string[] = [];
    const bindings: string[] = [];
    for (const match of instruction.matchAll(GENERATION_MARKER_RE)) {
        const sigil = match[1];
        const name = match[2];
        if (name === undefined) {
            continue;
        }
        if (sigil === "@") {
            references.push(name);
        } else if (sigil === "$") {
            bindings.push(name);
        }
    }

    return {
        instruction,
        references: extractUnique(references),
        bindings: extractUnique(bindings),
    };
}
