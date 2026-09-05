import { createToken, Lexer, type TokenType } from "chevrotain";

export const Identifier = createToken({
    name: "Identifier",
    label: "identifier",
    pattern: /[A-Za-z_][A-Za-z0-9_]*/,
});

const keyword = (name: string, literal: string, label: string): TokenType =>
    createToken({ name, label, pattern: new RegExp(literal), longer_alt: Identifier });

export const Let = keyword("Let", "let", "let");
export const If = keyword("If", "if", "if");
export const Else = keyword("Else", "else", "else");
export const For = keyword("For", "for", "for");
export const In = keyword("In", "in", "in");
export const While = keyword("While", "while", "while");
export const Try = keyword("Try", "try", "try");
export const Catch = keyword("Catch", "catch", "catch");
export const Return = keyword("Return", "return", "return");
export const True = keyword("True", "true", "true");
export const False = keyword("False", "false", "false");
export const Null = keyword("Null", "null", "null");

export const NumberLiteral = createToken({
    name: "NumberLiteral",
    label: "number",
    pattern: /\d+(\.\d+)?/,
});

export const StringLiteral = createToken({
    name: "StringLiteral",
    label: "string",
    pattern: /"(\\"|[^"\n\\])*"/,
});

export const Comment = createToken({
    name: "Comment",
    label: "comment",
    pattern: Lexer.NA,
});

export const LineComment = createToken({
    name: "LineComment",
    pattern: /\/\/[^\n]*/,
    categories: [Comment],
});
export const BlockComment = createToken({
    name: "BlockComment",
    pattern: /\/\*[\s\S]*?\*\//,
    categories: [Comment],
});

export const Eol = createToken({
    name: "Eol",
    label: "statement separator",
    pattern: /[\r\n;]+/,
});

export const WhiteSpace = createToken({
    name: "WhiteSpace",
    line_breaks: false,
    group: Lexer.SKIPPED,
    pattern: /[ \t]+/,
});

export const LParen = createToken({ name: "LParen", label: "'('", pattern: /\(/ });
export const RParen = createToken({ name: "RParen", label: "')'", pattern: /\)/ });
export const LBrace = createToken({ name: "LBrace", label: "'{'", pattern: /\{/ });
export const RBrace = createToken({ name: "RBrace", label: "'}'", pattern: /\}/ });
export const Comma = createToken({ name: "Comma", label: "','", pattern: /,/ });
export const Dot = createToken({ name: "Dot", label: "'.'", pattern: /\./ });

export const Assign = createToken({ name: "Assign", label: "'='", pattern: /=/ });
export const Plus = createToken({ name: "Plus", label: "'+'", pattern: /\+/ });
export const Minus = createToken({ name: "Minus", label: "'-'", pattern: /-/ });
export const Star = createToken({ name: "Star", label: "'*'", pattern: /\*/ });
export const Div = createToken({ name: "Div", label: "'/'", pattern: /\// });
export const Mod = createToken({ name: "Mod", label: "'%'", pattern: /%/ });

export const Eq = createToken({ name: "Eq", label: "'=='", pattern: /==/ });
export const NotEq = createToken({ name: "NotEq", label: "'!='", pattern: /!=/ });
export const Lt = createToken({ name: "Lt", label: "'<'", pattern: /</ });
export const LtEq = createToken({ name: "LtEq", label: "'<='", pattern: /<=/ });
export const Gt = createToken({ name: "Gt", label: "'>'", pattern: />/ });
export const GtEq = createToken({ name: "GtEq", label: "'>='", pattern: />=/ });

export const LogicalNot = createToken({ name: "LogicalNot", label: "'!'", pattern: /!/ });
export const And = createToken({ name: "And", label: "'&&'", pattern: /&&/ });
export const Or = createToken({ name: "Or", label: "'||'", pattern: /\|\|/ });

export const tokenTypes = [
    Let,
    If,
    Else,
    For,
    In,
    While,
    Try,
    Catch,
    Return,
    True,
    False,
    Null,
    Eol,
    LParen,
    RParen,
    LBrace,
    RBrace,
    Comma,
    Dot,
    And,
    Or,
    Eq,
    NotEq,
    LtEq,
    GtEq,
    LineComment,
    BlockComment,
    Assign,
    Plus,
    Minus,
    Star,
    Div,
    Mod,
    Lt,
    Gt,
    LogicalNot,
    NumberLiteral,
    StringLiteral,
    Identifier,
    WhiteSpace,
];

export const lexer = new Lexer(tokenTypes, {
    positionTracking: "onlyOffset",
});
