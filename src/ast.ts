export interface SourceLocation {
    start: {
        line: number;
        column: number;
        offset: number;
    };
    end: {
        line: number;
        column: number;
        offset: number;
    };
}

export interface BaseNode {
    type: string;
    loc: SourceLocation;
}

export interface Program extends BaseNode {
    type: "Program";
    statements: Statement[];
}

export type Statement =
    | LetStatement
    | AssignmentStatement
    | ExpressionStatement
    | IfStatement
    | ForStatement
    | WhileStatement
    | TryStatement
    | ReturnStatement
    | Comment
    | GenerationDirective;

export interface LetStatement extends BaseNode {
    type: "LetStatement";
    name: IdentifierExpression;
    value: Expression;
}

export interface AssignmentStatement extends BaseNode {
    type: "AssignmentStatement";
    name: IdentifierExpression;
    value: Expression;
}

export interface ExpressionStatement extends BaseNode {
    type: "ExpressionStatement";
    expression: Expression;
}

export interface IfStatement extends BaseNode {
    type: "IfStatement";
    condition: Expression;
    consequent: Block;
    alternate: Block | undefined;
}

export interface ForStatement extends BaseNode {
    type: "ForStatement";
    variable: IdentifierExpression;
    iterable: Expression;
    body: Block;
}

export interface WhileStatement extends BaseNode {
    type: "WhileStatement";
    condition: Expression;
    body: Block;
}

export interface TryStatement extends BaseNode {
    type: "TryStatement";
    body: Block;
    handler: Block;
}

export interface ReturnStatement extends BaseNode {
    type: "ReturnStatement";
    argument: Expression | undefined;
}

export interface Block extends BaseNode {
    type: "Block";
    statements: Statement[];
}

export interface Comment extends BaseNode {
    type: "Comment";
    text: string;
}

export type Expression =
    | LiteralExpression
    | IdentifierExpression
    | CallExpression
    | MemberExpression
    | UnaryExpression
    | BinaryExpression;

export interface LiteralExpression extends BaseNode {
    type: "LiteralExpression";
    kind: "number" | "string" | "boolean" | "null";
    value: number | string | boolean | null;
    raw: string;
}

export interface IdentifierExpression extends BaseNode {
    type: "IdentifierExpression";
    name: string;
}

export interface CallExpression extends BaseNode {
    type: "CallExpression";
    callee: Expression;
    arguments: Expression[];
}

export interface MemberExpression extends BaseNode {
    type: "MemberExpression";
    object: Expression;
    property: IdentifierExpression;
}

export interface UnaryExpression extends BaseNode {
    type: "UnaryExpression";
    operator: "!" | "-";
    argument: Expression;
}

export interface BinaryExpression extends BaseNode {
    type: "BinaryExpression";
    operator: "+" | "-" | "*" | "/" | "%" | "<" | "<=" | ">" | ">=" | "==" | "!=" | "&&" | "||";
    left: Expression;
    right: Expression;
}

export interface GenerationDirective extends BaseNode {
    type: "GenerationDirective";
    instruction: string;
    references: string[];
    bindings: string[];
}
