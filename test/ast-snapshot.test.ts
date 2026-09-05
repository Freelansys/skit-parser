import { describe, expect, it } from "vitest";
import { flatten, parseOk } from "./helpers.js";

describe("full-program AST regression", () => {
    it("produces the expected AST for a representative program", () => {
        const source = [
            "let values = get_values()",
            "let ticking = true",
            "let result = 0",
            "",
            "/*",
            "gen:",
            "    compute the average of @values and store it in $mean",
            "*/",
            "",
            "if mean > 0 {",
            "    for item in values {",
            "        while ticking {",
            "            process(item)",
            "        }",
            "    }",
            "} else {",
            "    try {",
            "        result = parse(values)",
            "    } catch {",
            "        return null",
            "    }",
            "}",
            "",
            "return mean",
        ].join("\n");

        const ast = parseOk(source);
        const flat = flatten(ast);

        expect(flat).toEqual({
            type: "Program",
            statements: [
                {
                    type: "LetStatement",
                    name: { type: "IdentifierExpression", name: "values" },
                    value: {
                        type: "CallExpression",
                        callee: { type: "IdentifierExpression", name: "get_values" },
                        arguments: [],
                    },
                },
                {
                    type: "LetStatement",
                    name: { type: "IdentifierExpression", name: "ticking" },
                    value: {
                        type: "LiteralExpression",
                        kind: "boolean",
                        value: true,
                        raw: "true",
                    },
                },
                {
                    type: "LetStatement",
                    name: { type: "IdentifierExpression", name: "result" },
                    value: {
                        type: "LiteralExpression",
                        kind: "number",
                        value: 0,
                        raw: "0",
                    },
                },
                {
                    type: "GenerationDirective",
                    instruction: "compute the average of @values and store it in $mean",
                    references: ["values"],
                    bindings: ["mean"],
                },
                {
                    type: "IfStatement",
                    condition: {
                        type: "BinaryExpression",
                        operator: ">",
                        left: { type: "IdentifierExpression", name: "mean" },
                        right: { type: "LiteralExpression", kind: "number", value: 0, raw: "0" },
                    },
                    consequent: {
                        type: "Block",
                        statements: [
                            {
                                type: "ForStatement",
                                variable: { type: "IdentifierExpression", name: "item" },
                                iterable: { type: "IdentifierExpression", name: "values" },
                                body: {
                                    type: "Block",
                                    statements: [
                                        {
                                            type: "WhileStatement",
                                            condition: {
                                                type: "IdentifierExpression",
                                                name: "ticking",
                                            },
                                            body: {
                                                type: "Block",
                                                statements: [
                                                    {
                                                        type: "ExpressionStatement",
                                                        expression: {
                                                            type: "CallExpression",
                                                            callee: {
                                                                type: "IdentifierExpression",
                                                                name: "process",
                                                            },
                                                            arguments: [
                                                                {
                                                                    type: "IdentifierExpression",
                                                                    name: "item",
                                                                },
                                                            ],
                                                        },
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                    alternate: {
                        type: "Block",
                        statements: [
                            {
                                type: "TryStatement",
                                body: {
                                    type: "Block",
                                    statements: [
                                        {
                                            type: "AssignmentStatement",
                                            name: {
                                                type: "IdentifierExpression",
                                                name: "result",
                                            },
                                            value: {
                                                type: "CallExpression",
                                                callee: {
                                                    type: "IdentifierExpression",
                                                    name: "parse",
                                                },
                                                arguments: [
                                                    {
                                                        type: "IdentifierExpression",
                                                        name: "values",
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                },
                                handler: {
                                    type: "Block",
                                    statements: [
                                        {
                                            type: "ReturnStatement",
                                            argument: {
                                                type: "LiteralExpression",
                                                kind: "null",
                                                value: null,
                                                raw: "null",
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                },
                {
                    type: "ReturnStatement",
                    argument: { type: "IdentifierExpression", name: "mean" },
                },
            ],
        });
    });

    it("drops location metadata from the flattened snapshot", () => {
        const ast = parseOk("let x = 1");
        const flat = flatten(ast);
        expect(JSON.stringify(flat)).not.toContain("loc");
        expect(flat).toEqual({
            type: "Program",
            statements: [
                {
                    type: "LetStatement",
                    name: { type: "IdentifierExpression", name: "x" },
                    value: { type: "LiteralExpression", kind: "number", value: 1, raw: "1" },
                },
            ],
        });
    });
});
