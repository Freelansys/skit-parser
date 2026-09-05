import { describe, expect, it } from "vitest";
import { parseErr, parseOk, flatten } from "./helpers.js";
import { LetStatement } from "../src/ast.js";

describe("public API", () => {
    it("returns an ast with no errors for valid input", () => {
        const result = parseOk("let x = 1");
        expect(result.type).toBe("Program");
    });

    it("exposes a Program with statements", () => {
        const ast = parseOk("let x = 1\nreturn x");
        expect(ast.type).toBe("Program");
        expect(ast.statements).toHaveLength(2);
        expect(ast.statements[0].type).toBe("LetStatement");
        expect(ast.statements[1].type).toBe("ReturnStatement");
    });

    it("returns undefined ast with errors for invalid input", () => {
        const result = parseErr("let x =");
        expect(result.ast).toBeUndefined();
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it("reports unexpected tokens with a location", () => {
        const result = parseErr("let x = 1 + )");
        const error = result.errors[0];
        expect(error.message).toMatch(/Unexpected token/);
        expect(error.location?.start.offset).toBeGreaterThanOrEqual(0);
    });

    it("reports malformed input without silently producing an AST", () => {
        const result = parseErr("if x {");
        expect(errorCodeSet(result)).toEqual(new Set(["unexpected-token"]));
    });
});

function errorCodeSet(result: ReturnType<typeof parseErr>): Set<string> {
    return new Set(result.errors.map((e) => e.code));
}

describe("basic parsing", () => {
    it("parses declarations", () => {
        const ast = parseOk("let x = 1");
        expect(flatten(ast.statements)).toEqual([
            {
                type: "LetStatement",
                name: { type: "IdentifierExpression", name: "x" },
                value: { type: "LiteralExpression", kind: "number", value: 1, raw: "1" },
            },
        ]);
    });

    it("parses assignment", () => {
        const ast = parseOk("let x = 1\nx = 2");
        expect(ast.statements[1]).toMatchObject({
            type: "AssignmentStatement",
            name: { type: "IdentifierExpression", name: "x" },
            value: { type: "LiteralExpression", kind: "number", value: 2 },
        });
    });

    it("parses zero-argument and multi-argument calls", () => {
        const ast = parseOk("let x = 1\nlet y = 2\nfoo()\nfoo(x, y)");
        expect(ast.statements[2]).toMatchObject({
            type: "ExpressionStatement",
            expression: { type: "CallExpression", callee: { name: "foo" }, arguments: [] },
        });
        expect(ast.statements[3]).toMatchObject({
            type: "ExpressionStatement",
            expression: {
                type: "CallExpression",
                callee: { name: "foo" },
                arguments: [{ name: "x" }, { name: "y" }],
            },
        });
    });

    it("parses bare return", () => {
        const ast = parseOk("return");
        expect(ast.statements[0]).toMatchObject({ type: "ReturnStatement", argument: undefined });
    });

    it("accepts one or multiple statements per line with semicolons", () => {
        expect(parseOk("let x = 1; let y = 2; x = y").statements).toHaveLength(3);
    });

    it("ignores trailing separators", () => {
        const ast = parseOk("let x = 1\n\n");
        expect(ast.statements).toHaveLength(1);
    });

    it("parses a completely empty program", () => {
        const ast = parseOk("");
        expect(ast.statements).toEqual([]);
    });
});

describe("location metadata", () => {
    it("attaches 1-based line/column and offsets to nodes", () => {
        const ast = parseOk("let x = 10");
        const nameLoc = (ast.statements[0] as LetStatement).name.loc;
        expect(nameLoc.start).toEqual({ line: 1, column: 5, offset: 4 });
        expect(nameLoc.end).toEqual({ line: 1, column: 6, offset: 5 });

        const valueLoc = (ast.statements[0] as LetStatement).value.loc;
        expect(valueLoc.start).toEqual({ line: 1, column: 9, offset: 8 });
        expect(valueLoc.end).toEqual({ line: 1, column: 11, offset: 10 });
    });

    it("spans multi-line node locations", () => {
        const ast = parseOk("let a = 1\nlet b = a +\n  2");
        expect(ast.statements[1].loc.start.line).toBe(2);
        expect(ast.statements[1].loc.end.line).toBe(3);
    });
});
