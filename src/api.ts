import {
    EarlyExitException,
    EOF,
    MismatchedTokenException,
    NoViableAltException,
    type IRecognitionException,
    type IToken,
    type ILexingError,
} from "chevrotain";
import type { Program } from "./ast.js";
import type { ParserError } from "./error.js";
import { LineMap } from "./location.js";
import { lexer } from "./tokens.js";
import { SkitParser } from "./parser.js";
import { AstBuilder } from "./builder.js";

export interface ParseResult {
    ast: Program | undefined;
    errors: ParserError[];
}

export function parseSkit(source: string): ParseResult {
    const lineMap = new LineMap(source);

    const lexerResult = lexer.tokenize(source);
    if (lexerResult.errors.length > 0) {
        const errors: ParserError[] = lexerResult.errors.map((lexerError: ILexingError) => ({
            code: "lexer-error",
            message: `Unable to tokenize input near ${describePosition(lexerError)}: illegal character.`,
            location: lineMap.locFromOffsets(lexerError.offset, lexerError.offset + 1),
            details: lexerError.message,
        }));
        return { ast: undefined, errors };
    }

    const parser = new SkitParser();
    parser.input = lexerResult.tokens;

    let programCst;
    try {
        programCst = parser.program();
    } catch (error) {
        if (error instanceof Error && "token" in error && isRecognitionExceptionLike(error)) {
            return {
                ast: undefined,
                errors: [recognitionErrorToParserError(error as IRecognitionException, lineMap)],
            };
        }
        throw error;
    }

    if (parser.errors.length > 0) {
        return {
            ast: undefined,
            errors: parser.errors.map((error) => recognitionErrorToParserError(error, lineMap)),
        };
    }

    const ast = new AstBuilder().build(programCst, source);
    return { ast, errors: [] };
}

function isRecognitionExceptionLike(error: Error): boolean {
    return (
        error instanceof MismatchedTokenException ||
        error instanceof NoViableAltException ||
        error instanceof EarlyExitException
    );
}

function recognitionErrorToParserError(
    error: IRecognitionException,
    lineMap: LineMap,
): ParserError {
    const details = error instanceof Error ? error.message : undefined;

    if (error instanceof MismatchedTokenException || error instanceof NoViableAltException) {
        return {
            code: "unexpected-token",
            message: describeUnexpectedToken(error.token),
            location: tokenLocation(error.token, lineMap),
            details,
        };
    }
    if (error instanceof EarlyExitException) {
        return {
            code: "malformed-expression",
            message: describeUnexpectedToken(error.token),
            location: tokenLocation(error.token, lineMap),
            details,
        };
    }
    return {
        code: "unexpected-token",
        message: describeUnexpectedToken(error.token),
        location: tokenLocation(error.token, lineMap),
        details,
    };
}

function describeUnexpectedToken(token: IToken | undefined): string {
    if (token === undefined || token.tokenType === EOF) {
        return "Unexpected end of input.";
    }
    return `Unexpected token '${token.image}'.`;
}

function tokenLocation(token: IToken | undefined, lineMap: LineMap): ParserError["location"] {
    if (token === undefined) {
        return undefined;
    }
    return lineMap.tokenLoc(token);
}

function describePosition(lexerError: ILexingError): string {
    const line = lexerError.line ?? 0;
    const column = lexerError.column ?? 0;
    return `line ${line}, column ${column}`;
}
