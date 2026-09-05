import { describe, expect, it } from "vitest";
import { parseOk } from "./helpers.js";

describe("generation directive extraction", () => {
    it("extracts instruction, references and bindings from a line directive", () => {
        const ast = parseOk(
            "let values = get_values()\n// gen: compute the average of @values and store it in $mean\nreturn mean",
        );
        expect(ast.statements[1]).toMatchObject({
            type: "GenerationDirective",
            instruction: "compute the average of @values and store it in $mean",
            references: ["values"],
            bindings: ["mean"],
        });
    });

    it("extracts from a multiline block directive", () => {
        const source = [
            "let values = get_values()",
            "/*",
            "gen:",
            "    compute the average of @values",
            "    ignoring missing values,",
            "    and store the result in $mean.",
            "*/",
            "return mean",
        ].join("\n");
        const ast = parseOk(source);
        expect(ast.statements[1]).toMatchObject({
            type: "GenerationDirective",
            instruction:
                "compute the average of @values ignoring missing values, and store the result in $mean.",
            references: ["values"],
            bindings: ["mean"],
        });
    });

    it("collects multiple references and bindings in order", () => {
        const ast = parseOk(
            "let data = 1\n/* gen: split @data into $train and $test */\nprocess(train, test)",
        );
        expect(ast.statements[1]).toMatchObject({
            type: "GenerationDirective",
            references: ["data"],
            bindings: ["train", "test"],
        });
    });

    it("deduplicates repeated references", () => {
        const ast = parseOk(
            "let x = 1\nlet y = 2\n/* gen: combine @x and @y using @x into $z */\nreturn z",
        );
        expect(ast.statements[2]).toMatchObject({
            type: "GenerationDirective",
            references: ["x", "y"],
            bindings: ["z"],
        });
    });

    it("does not match markers inside words", () => {
        const ast = parseOk("let x = 1\n/* gen: cost$x and mail@x */\nreturn x");
        expect(ast.statements[1]).toMatchObject({
            type: "GenerationDirective",
            references: [],
            bindings: [],
        });
    });

    it("does not match escaped markers", () => {
        const ast = parseOk("let x = 1\n/* gen: use \\$x literally and \\@y too */\nreturn x");
        expect(ast.statements[1]).toMatchObject({
            type: "GenerationDirective",
            references: [],
            bindings: [],
        });
    });

    it("requires the gen: marker at the start of the comment", () => {
        const ast = parseOk("/* not at start gen: nothing */\nlet x = 1");
        expect(ast.statements[0]).toMatchObject({ type: "Comment" });
    });
});

describe("generation-only blocks", () => {
    it("allows a directive as the only statement in an if block", () => {
        const ast = parseOk(
            "let condition = true\nif condition {\n    /* gen: perform the required operation */\n}",
        );
        expect(ast.statements[1]).toMatchObject({
            type: "IfStatement",
            consequent: {
                type: "Block",
                statements: [{ type: "GenerationDirective" }],
            },
        });
    });

    it("allows a directive as the only statement in a while block", () => {
        const ast = parseOk(
            "let condition = true\nwhile condition {\n    // gen: perform the required operation\n}",
        );
        expect(ast.statements[1]).toMatchObject({
            type: "WhileStatement",
            body: { type: "Block", statements: [{ type: "GenerationDirective" }] },
        });
    });
});

describe("generation directive scope rules", () => {
    it("makes inner-block bindings available within the block", () => {
        const ast = parseOk(
            "let condition = true\nif condition {\n    /* gen: store a result in $result */\n    return result\n}",
        );
        expect(ast.statements[1]).toMatchObject({ type: "IfStatement" });
    });
});
