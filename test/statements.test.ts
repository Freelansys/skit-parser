import { describe, expect, it } from "vitest";
import { parseOk } from "./helpers.js";
import { Comment } from "../src/ast.js";

describe("control flow statements", () => {
    it("parses an empty if block", () => {
        const ast = parseOk("let x = true\nif x {\n}");
        expect(ast.statements[1]).toMatchObject({
            type: "IfStatement",
            condition: { type: "IdentifierExpression", name: "x" },
            consequent: { type: "Block", statements: [] },
            alternate: undefined,
        });
    });

    it("parses if/else", () => {
        const ast = parseOk("let x = true\nif x {\n    foo()\n} else {\n    bar()\n}");
        const ifStmt = ast.statements[1];
        expect(ifStmt).toMatchObject({
            type: "IfStatement",
            consequent: { type: "Block", statements: [{ type: "ExpressionStatement" }] },
            alternate: { type: "Block", statements: [{ type: "ExpressionStatement" }] },
        });
    });

    it("parses if/else with a newline before else", () => {
        const ast = parseOk("let x = true\nif x {\n    foo()\n}\nelse {\n    bar()\n}");
        expect(ast.statements[1]).toMatchObject({
            type: "IfStatement",
            alternate: { type: "Block" },
        });
    });

    it("parses nested if as else-if substitute", () => {
        const ast = parseOk(
            "let x = 1\nif x > 0 {\n    return x\n} else {\n    if x == 0 {\n        return 0\n    }\n}",
        );
        expect(ast.statements[1]).toMatchObject({ type: "IfStatement" });
    });

    it("parses for in", () => {
        const ast = parseOk("let items = 1\nfor item in items {\n    process(item)\n}");
        expect(ast.statements[1]).toMatchObject({
            type: "ForStatement",
            variable: { type: "IdentifierExpression", name: "item" },
            iterable: { type: "IdentifierExpression", name: "items" },
            body: { type: "Block", statements: [{ type: "ExpressionStatement" }] },
        });
    });

    it("parses while", () => {
        const ast = parseOk("let x = 0\nwhile x < 10 {\n    x = x + 1\n}");
        expect(ast.statements[1]).toMatchObject({
            type: "WhileStatement",
            condition: { type: "BinaryExpression", operator: "<" },
            body: { type: "Block", statements: [{ type: "AssignmentStatement" }] },
        });
    });

    it("parses try/catch exactly", () => {
        const ast = parseOk(
            "let input = 1\nlet result = 0\ntry {\n    result = parse(input)\n} catch {\n    return null\n}",
        );
        expect(ast.statements[2]).toMatchObject({
            type: "TryStatement",
            body: { type: "Block" },
            handler: { type: "Block" },
        });
    });
});

describe("nested blocks", () => {
    it("parses arbitrarily nested control flow", () => {
        const source = [
            "let x = 0",
            "let items = 1",
            "let condition = true",
            "if x {",
            "    for item in items {",
            "        while condition {",
            "            process(item)",
            "        }",
            "    }",
            "}",
        ].join("\n");
        const ast = parseOk(source);
        expect(ast.statements[3]).toMatchObject({ type: "IfStatement" });
    });

    it("supports single-line nested blocks", () => {
        const ast = parseOk(
            "let x = 1\nlet items = 0\nif x { for item in items { process(item) } }",
        );
        expect(ast.statements[2]).toMatchObject({ type: "IfStatement" });
    });
});

describe("comments", () => {
    it("preserves line comments as Comment nodes", () => {
        const ast = parseOk("let x = 1\n// a useful note\nreturn x");
        expect(ast.statements[1]).toEqual({
            type: "Comment",
            text: "a useful note",
            loc: expect.any(Object),
        });
    });

    it("preserves block comments as Comment nodes", () => {
        const ast = parseOk("/* multi\nline */\nlet x = 1");
        expect(ast.statements[0]).toMatchObject({ type: "Comment", text: "multi\nline" });
    });

    it("does not leak comment delimiters into the AST", () => {
        const ast = parseOk("// hello\nlet x = 1");
        expect((ast.statements[0] as Comment).text).not.toContain("//");
    });

    it("does not treat ordinary comments as generation directives", () => {
        const ast = parseOk("// not a directive @x $y\nlet x = 1");
        expect(ast.statements[0]).toMatchObject({ type: "Comment" });
    });

    it("keeps comments as the only statement in a block", () => {
        const ast = parseOk("let c = true\nif c {\n    // do nothing\n}");
        expect(ast.statements[1]).toMatchObject({
            type: "IfStatement",
            consequent: { type: "Block", statements: [{ type: "Comment" }] },
        });
    });
});
