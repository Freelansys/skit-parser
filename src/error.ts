import type { SourceLocation } from "./ast.js";

export type ErrorCode =
    | "lexer-error"
    | "unexpected-token"
    | "missing-block"
    | "malformed-expression"
    | "invalid-generation-directive";

export interface ParserError {
    code: ErrorCode;
    message: string;
    location: SourceLocation | undefined;
    /** Unparsed detail (token image, rule path, etc.). */
    details?: string;
}
