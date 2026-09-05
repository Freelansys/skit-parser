import type { IToken } from "chevrotain";
import type {
    BinaryExpression,
    Block,
    CallExpression,
    Comment as CommentNode,
    Expression,
    GenerationDirective,
    IdentifierExpression,
    LiteralExpression,
    Program,
    SourceLocation,
    Statement,
    UnaryExpression,
} from "./ast.js";
import { commentText, extractGenerationDirective } from "./generation.js";
import { LineMap, span } from "./location.js";
import { SkitParser } from "./parser.js";

type CstNode = any;

type BinaryOperator =
    "+" | "-" | "*" | "/" | "%" | "<" | "<=" | ">" | ">=" | "==" | "!=" | "&&" | "||";

const visitorConstructorCache = new WeakMap<typeof SkitParser, { new (...args: any[]): any }>();

function getBaseVisitor(): { new (...args: any[]): any } {
    const cached = visitorConstructorCache.get(SkitParser);
    if (cached !== undefined) {
        return cached;
    }
    const parser = new SkitParser();
    const base = parser.getBaseCstVisitorConstructor();
    visitorConstructorCache.set(SkitParser, base);
    return base;
}

interface Visitor {
    visit(node: CstNode): unknown;
}

export class AstBuilder {
    private readonly visitor: Visitor;
    private lineMap!: LineMap;

    constructor() {
        const BaseVisitor = getBaseVisitor();
        const builder = this;

        class SkitAstVisitor extends BaseVisitor {
            program(ctx: CstNode): Program {
                const statements: Statement[] = (ctx.statement ?? []).map((n: CstNode) =>
                    builder.visit(n),
                );
                if (statements.length === 0) {
                    return {
                        type: "Program",
                        statements,
                        loc: builder.lineMap.locFromOffsets(0, 0),
                    };
                }
                return {
                    type: "Program",
                    statements,
                    loc: span(statements[0].loc, statements[statements.length - 1].loc),
                };
            }

            statement(ctx: CstNode): Statement {
                if (ctx.declaration != null) {
                    return builder.visit(ctx.declaration[0]);
                }
                if (ctx.assignment != null) {
                    return builder.visit(ctx.assignment[0]);
                }
                if (ctx.expressionStatement != null) {
                    return builder.visit(ctx.expressionStatement[0]);
                }
                if (ctx.ifStatement != null) {
                    return builder.visit(ctx.ifStatement[0]);
                }
                if (ctx.forStatement != null) {
                    return builder.visit(ctx.forStatement[0]);
                }
                if (ctx.whileStatement != null) {
                    return builder.visit(ctx.whileStatement[0]);
                }
                if (ctx.tryStatement != null) {
                    return builder.visit(ctx.tryStatement[0]);
                }
                if (ctx.returnStatement != null) {
                    return builder.visit(ctx.returnStatement[0]);
                }
                if (ctx.commentStatement != null) {
                    const cs = ctx.commentStatement[0].children;
                    const token = cs.LineComment?.[0] ?? cs.BlockComment[0];
                    return builder.commentNode(token);
                }
                throw new Error("unreachable: unknown statement CST node");
            }

            declaration(ctx: CstNode): Statement {
                const name = builder.identifierNode(ctx.Identifier[0]);
                const value: Expression = builder.visit(ctx.expression[0]);
                return {
                    type: "LetStatement",
                    name,
                    value,
                    loc: span(name.loc, value.loc),
                };
            }

            assignment(ctx: CstNode): Statement {
                const name = builder.identifierNode(ctx.Identifier[0]);
                const value: Expression = builder.visit(ctx.expression[0]);
                return {
                    type: "AssignmentStatement",
                    name,
                    value,
                    loc: span(name.loc, value.loc),
                };
            }

            expressionStatement(ctx: CstNode): Statement {
                const expression: Expression = builder.visit(ctx.expression[0]);
                return { type: "ExpressionStatement", expression, loc: expression.loc };
            }

            ifStatement(ctx: CstNode): Statement {
                const condition: Expression = builder.visit(ctx.expression[0]);
                const consequent: Block = builder.visit(ctx.block[0]);
                const alternate: Block | undefined =
                    ctx.block.length > 1 ? builder.visit(ctx.block[1]) : undefined;
                return {
                    type: "IfStatement",
                    condition,
                    consequent,
                    alternate,
                    loc: span(condition.loc, (alternate ?? consequent).loc),
                };
            }

            forStatement(ctx: CstNode): Statement {
                const variable = builder.identifierNode(ctx.Identifier[0]);
                const iterable: Expression = builder.visit(ctx.expression[0]);
                const body: Block = builder.visit(ctx.block[0]);
                return {
                    type: "ForStatement",
                    variable,
                    iterable,
                    body,
                    loc: span(variable.loc, body.loc),
                };
            }

            whileStatement(ctx: CstNode): Statement {
                const condition: Expression = builder.visit(ctx.expression[0]);
                const body: Block = builder.visit(ctx.block[0]);
                return {
                    type: "WhileStatement",
                    condition,
                    body,
                    loc: span(condition.loc, body.loc),
                };
            }

            tryStatement(ctx: CstNode): Statement {
                const body: Block = builder.visit(ctx.block[0]);
                const handler: Block = builder.visit(ctx.block[1]);
                return { type: "TryStatement", body, handler, loc: span(body.loc, handler.loc) };
            }

            returnStatement(ctx: CstNode): Statement {
                const argument: Expression | undefined =
                    ctx.expression != null ? builder.visit(ctx.expression[0]) : undefined;
                return {
                    type: "ReturnStatement",
                    argument,
                    loc: span(
                        builder.tokenLoc(ctx.Return[0]),
                        argument !== undefined ? argument.loc : builder.tokenLoc(ctx.Return[0]),
                    ),
                };
            }

            block(ctx: CstNode): Block {
                const statements: Statement[] = (ctx.statement ?? []).map((n: CstNode) =>
                    builder.visit(n),
                );
                return {
                    type: "Block",
                    statements,
                    loc: span(builder.tokenLoc(ctx.LBrace[0]), builder.tokenLoc(ctx.RBrace[0])),
                };
            }

            expression(ctx: CstNode): Expression {
                return builder.visit(ctx.logicalOr[0]);
            }

            logicalOr(ctx: CstNode): Expression {
                const operands: Expression[] = ctx.logicalAnd.map((n: CstNode) => builder.visit(n));
                return builder.foldBinary(operands, ctx.Or ?? []);
            }

            logicalAnd(ctx: CstNode): Expression {
                const operands: Expression[] = ctx.equality.map((n: CstNode) => builder.visit(n));
                return builder.foldBinary(operands, ctx.And ?? []);
            }

            equality(ctx: CstNode): Expression {
                const operands: Expression[] = ctx.relational.map((n: CstNode) => builder.visit(n));
                const ops: IToken[] = builder.sortTokens([...(ctx.Eq ?? []), ...(ctx.NotEq ?? [])]);
                return builder.foldBinary(operands, ops);
            }

            relational(ctx: CstNode): Expression {
                const operands: Expression[] = ctx.additive.map((n: CstNode) => builder.visit(n));
                const ops: IToken[] = builder.sortTokens([
                    ...(ctx.Lt ?? []),
                    ...(ctx.LtEq ?? []),
                    ...(ctx.Gt ?? []),
                    ...(ctx.GtEq ?? []),
                ]);
                return builder.foldBinary(operands, ops);
            }

            additive(ctx: CstNode): Expression {
                const operands: Expression[] = ctx.multiplicative.map((n: CstNode) =>
                    builder.visit(n),
                );
                const ops: IToken[] = builder.sortTokens([
                    ...(ctx.Plus ?? []),
                    ...(ctx.Minus ?? []),
                ]);
                return builder.foldBinary(operands, ops);
            }

            multiplicative(ctx: CstNode): Expression {
                const operands: Expression[] = ctx.unary.map((n: CstNode) => builder.visit(n));
                const ops: IToken[] = builder.sortTokens([
                    ...(ctx.Star ?? []),
                    ...(ctx.Div ?? []),
                    ...(ctx.Mod ?? []),
                ]);
                return builder.foldBinary(operands, ops);
            }

            unary(ctx: CstNode): Expression {
                const argument: Expression = builder.visit(ctx.postfix[0]);
                const ops = builder.sortTokens([...(ctx.LogicalNot ?? []), ...(ctx.Minus ?? [])]);
                let node = argument;
                for (let i = ops.length - 1; i >= 0; i--) {
                    node = builder.unaryNode(ops[i], node);
                }
                return node;
            }

            postfix(ctx: CstNode): Expression {
                let node: Expression = builder.visit(ctx.primary[0]);
                const suffixes: CstNode[] = [
                    ...(ctx.memberSuffix ?? []),
                    ...(ctx.callSuffix ?? []),
                ].sort((a, b) => builder.suffixStartOffset(a) - builder.suffixStartOffset(b));
                for (const suffix of suffixes) {
                    if (suffix.children.LParen != null) {
                        node = builder.applyCallSuffix(node, suffix);
                    } else {
                        node = builder.applyMemberSuffix(node, suffix);
                    }
                }
                return node;
            }

            primary(ctx: CstNode): Expression {
                if (ctx.NumberLiteral != null) {
                    return builder.literalNode(ctx.NumberLiteral[0], "number");
                }
                if (ctx.StringLiteral != null) {
                    return builder.literalNode(ctx.StringLiteral[0], "string");
                }
                if (ctx.True != null) {
                    return builder.keywordLiteralNode(ctx.True[0], true);
                }
                if (ctx.False != null) {
                    return builder.keywordLiteralNode(ctx.False[0], false);
                }
                if (ctx.Null != null) {
                    return builder.literalNode(ctx.Null[0], "null");
                }
                if (ctx.Identifier != null) {
                    return builder.identifierNode(ctx.Identifier[0]);
                }
                if (ctx.expression != null) {
                    return builder.visit(ctx.expression[0]);
                }
                throw new Error("unreachable: unknown primary CST node");
            }
        }

        this.visitor = new SkitAstVisitor() as unknown as Visitor;
    }

    private visit(node: CstNode): any {
        return this.visitor.visit(node);
    }

    private tokenLoc(token: IToken): SourceLocation {
        return this.lineMap.tokenLoc(token);
    }

    private sortTokens(tokens: IToken[]): IToken[] {
        return tokens.sort((a, b) => a.startOffset - b.startOffset);
    }

    private foldBinary(operands: Expression[], opTokens: IToken[]): Expression {
        let left = operands[0];
        for (let i = 0; i < opTokens.length; i++) {
            const right = operands[i + 1];
            const binary: BinaryExpression = {
                type: "BinaryExpression",
                operator: toBinaryOperator(opTokens[i]),
                left,
                right,
                loc: span(left.loc, right.loc),
            };
            left = binary;
        }
        return left;
    }

    private unaryNode(op: IToken, argument: Expression): UnaryExpression {
        return {
            type: "UnaryExpression",
            operator: op.tokenType.name === "LogicalNot" ? "!" : "-",
            argument,
            loc: span(this.tokenLoc(op), argument.loc),
        };
    }

    private applyMemberSuffix(node: Expression, member: CstNode): Expression {
        const property = this.identifierNode(member.children.Identifier[0]);
        return {
            type: "MemberExpression",
            object: node,
            property,
            loc: span(node.loc, property.loc),
        };
    }

    private applyCallSuffix(node: Expression, call: CstNode): Expression {
        const children = call.children;
        const args: Expression[] = (children.expression ?? []).map((n: CstNode) => this.visit(n));
        const rparen: IToken = children.RParen[0];
        return {
            type: "CallExpression",
            callee: node,
            arguments: args,
            loc: span(node.loc, this.tokenLoc(rparen)),
        };
    }

    private suffixStartOffset(suffix: CstNode): number {
        const dot = suffix.children.Dot?.[0];
        const lparen = suffix.children.LParen?.[0];
        return (dot ?? lparen).startOffset;
    }

    private literalNode(token: IToken, kind: "number" | "string" | "null"): LiteralExpression {
        const raw = token.image;
        return {
            type: "LiteralExpression",
            kind,
            value: parseLiteralValue(kind, raw),
            raw,
            loc: this.tokenLoc(token),
        };
    }

    private keywordLiteralNode(token: IToken, value: boolean): LiteralExpression {
        return {
            type: "LiteralExpression",
            kind: "boolean",
            value,
            raw: token.image,
            loc: this.tokenLoc(token),
        };
    }

    private identifierNode(token: IToken): IdentifierExpression {
        return {
            type: "IdentifierExpression",
            name: token.image,
            loc: this.tokenLoc(token),
        };
    }

    private commentNode(token: IToken): CommentNode | GenerationDirective {
        const raw = token.image;
        const loc = this.tokenLoc(token);
        const directive = extractGenerationDirective(raw);
        if (directive !== undefined) {
            return {
                type: "GenerationDirective",
                instruction: directive.instruction,
                references: directive.references,
                bindings: directive.bindings,
                loc,
            };
        }
        return { type: "Comment", text: commentText(raw), loc };
    }

    build(programCst: CstNode, source: string): Program {
        this.lineMap = new LineMap(source);
        return this.visit(programCst) as Program;
    }
}

function parseLiteralValue(
    kind: "number" | "string" | "null",
    raw: string,
): number | string | null {
    if (kind === "number") {
        return Number(raw);
    }
    if (kind === "string") {
        const inner = raw.slice(1, -1);
        return inner.replace(/\\"/g, '"');
    }
    return null;
}

function toBinaryOperator(token: IToken): BinaryOperator {
    return token.image as BinaryOperator;
}
