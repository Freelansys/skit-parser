import { describe, expect, it } from "vitest";
import { parseOk } from "./helpers.js";
import { LetStatement } from "../src/ast.js";

function expr(source: string): unknown {
    const ast = parseOk(`let value = ${source}`);
    return (ast.statements[0] as LetStatement).value;
}

describe("literals", () => {
    it("parses numbers (including decimals)", () => {
        expect(expr("1")).toMatchObject({ type: "LiteralExpression", kind: "number", value: 1 });
        expect(expr("3.14")).toMatchObject({
            type: "LiteralExpression",
            kind: "number",
            value: 3.14,
        });
    });

    it("parses strings", () => {
        expect(expr('"hello"')).toMatchObject({
            type: "LiteralExpression",
            kind: "string",
            value: "hello",
        });
    });

    it("parses booleans and null", () => {
        expect(expr("true")).toMatchObject({
            type: "LiteralExpression",
            kind: "boolean",
            value: true,
        });
        expect(expr("false")).toMatchObject({
            type: "LiteralExpression",
            kind: "boolean",
            value: false,
        });
        expect(expr("null")).toMatchObject({
            type: "LiteralExpression",
            kind: "null",
            value: null,
        });
    });
});

describe("identifier and member access", () => {
    it("parses identifiers", () => {
        expect(expr("foo")).toMatchObject({ type: "IdentifierExpression", name: "foo" });
    });

    it("parses chained member access", () => {
        expect(expr("response.body.data")).toMatchObject({
            type: "MemberExpression",
            object: {
                type: "MemberExpression",
                object: { type: "IdentifierExpression", name: "response" },
                property: { type: "IdentifierExpression", name: "body" },
            },
            property: { type: "IdentifierExpression", name: "data" },
        });
    });

    it("parses method-style calls", () => {
        expect(expr("response.fetch()")).toMatchObject({
            type: "CallExpression",
            callee: {
                type: "MemberExpression",
                object: { type: "IdentifierExpression", name: "response" },
                property: { type: "IdentifierExpression", name: "fetch" },
            },
            arguments: [],
        });
    });
});

describe("function calls", () => {
    it("parses calls with nested expressions", () => {
        expect(expr("foo(bar(x))")).toMatchObject({
            type: "CallExpression",
            callee: { name: "foo" },
            arguments: [
                {
                    type: "CallExpression",
                    callee: { name: "bar" },
                    arguments: [{ type: "IdentifierExpression", name: "x" }],
                },
            ],
        });
    });

    it("parses multi-argument calls with arithmetic", () => {
        expect(expr("calculate(a + b, c * d)")).toMatchObject({
            type: "CallExpression",
            arguments: [
                { type: "BinaryExpression", operator: "+" },
                { type: "BinaryExpression", operator: "*" },
            ],
        });
    });

    it("parses calls on call results", () => {
        expect(expr("get(1).run()")).toMatchObject({
            type: "CallExpression",
            callee: {
                type: "MemberExpression",
                object: {
                    type: "CallExpression",
                    callee: { name: "get" },
                },
            },
        });
    });
});

describe("arithmetic precedence", () => {
    it("treats * / % with higher precedence than + -", () => {
        expect(expr("a + b * c")).toMatchObject({
            type: "BinaryExpression",
            operator: "+",
            left: { name: "a" },
            right: {
                type: "BinaryExpression",
                operator: "*",
                left: { name: "b" },
                right: { name: "c" },
            },
        });
    });

    it("supports parentheses", () => {
        expect(expr("(a + b) * c")).toMatchObject({
            type: "BinaryExpression",
            operator: "*",
            left: { type: "BinaryExpression", operator: "+" },
            right: { name: "c" },
        });
    });

    it("uses left-associativity for -", () => {
        expect(expr("a - b - c")).toMatchObject({
            type: "BinaryExpression",
            operator: "-",
            left: { type: "BinaryExpression", operator: "-" },
            right: { name: "c" },
        });
    });

    it("parses division", () => {
        expect(expr("(a + b) / 2")).toMatchObject({
            type: "BinaryExpression",
            operator: "/",
        });
    });

    it("parses modulo", () => {
        expect(expr("a % b")).toMatchObject({
            type: "BinaryExpression",
            operator: "%",
        });
    });

    it("supports unary minus", () => {
        expect(expr("-x")).toMatchObject({
            type: "UnaryExpression",
            operator: "-",
            argument: { type: "IdentifierExpression", name: "x" },
        });
    });

    it("supports stacked unary operators", () => {
        expect(expr("!-x")).toMatchObject({
            type: "UnaryExpression",
            operator: "!",
            argument: { type: "UnaryExpression", operator: "-" },
        });
    });

    it("supports unary minus on literals and parens", () => {
        expect(expr("-1")).toMatchObject({ type: "UnaryExpression", operator: "-" });
        expect(expr("-(a + b)")).toMatchObject({ type: "UnaryExpression", operator: "-" });
    });
});

describe("comparison operators", () => {
    it.each(["<", "<=", ">", ">="])("parses %s", (op) => {
        expect(expr(`x ${op} y`)).toMatchObject({ type: "BinaryExpression", operator: op });
    });
});

describe("equality operators", () => {
    it.each(["==", "!="])("parses %s", (op) => {
        expect(expr(`x ${op} y`)).toMatchObject({ type: "BinaryExpression", operator: op });
    });
});

describe("logical operators", () => {
    it("parses && and ||", () => {
        expect(expr("a && b")).toMatchObject({ type: "BinaryExpression", operator: "&&" });
        expect(expr("a || b")).toMatchObject({ type: "BinaryExpression", operator: "||" });
    });

    it("parses !", () => {
        expect(expr("!valid")).toMatchObject({ type: "UnaryExpression", operator: "!" });
    });
});

describe("full precedence hierarchy", () => {
    it("parses a < b && c < d as (a < b) && (c < d)", () => {
        expect(expr("a < b && c < d")).toMatchObject({
            type: "BinaryExpression",
            operator: "&&",
            left: { type: "BinaryExpression", operator: "<" },
            right: { type: "BinaryExpression", operator: "<" },
        });
    });

    it("parses a == b || c == d && e == f with && binding tighter than ||", () => {
        expect(expr("a == b || c == d && e == f")).toMatchObject({
            type: "BinaryExpression",
            operator: "||",
            left: { type: "BinaryExpression", operator: "==" },
            right: { type: "BinaryExpression", operator: "&&" },
        });
    });

    it("parses !(a > b)", () => {
        expect(expr("!(a > b)")).toMatchObject({
            type: "UnaryExpression",
            operator: "!",
            argument: { type: "BinaryExpression", operator: ">" },
        });
    });
});
