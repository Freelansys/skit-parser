import { CstParser, type IToken, type TokenType } from "chevrotain";
import {
    And,
    Assign,
    Catch,
    Comma,
    Div,
    Dot,
    Eol,
    Else,
    Eq,
    False,
    For,
    Gt,
    GtEq,
    Identifier,
    If,
    In,
    LBrace,
    Let,
    LineComment,
    BlockComment,
    LParen,
    Lt,
    LtEq,
    LogicalNot,
    Minus,
    Mod,
    NotEq,
    Null,
    NumberLiteral,
    Or,
    Plus,
    RBrace,
    Return,
    RParen,
    Star,
    StringLiteral,
    True,
    Try,
    While,
    tokenTypes,
} from "./tokens.js";

/** Raw source is required by the parser only for location metadata. */
export interface ParserInput {
    source: string;
}

export class SkitParser extends CstParser {
    constructor() {
        super(tokenTypes);
        this.performSelfAnalysis();
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private consumeSeparators(): void {
        this.MANY(() => this.CONSUME(Eol));
    }

    private peekAfterSeparatorsIs(tokType: TokenType): boolean {
        let idx = 1;
        let tok: IToken | undefined = this.LA(idx);
        while (tok !== undefined && tok.tokenType === Eol) {
            idx += 1;
            tok = this.LA(idx);
        }
        return tok !== undefined && tok.tokenType === tokType;
    }

    // ------------------------------------------------------------------
    // Grammar productions
    // ------------------------------------------------------------------

    public program = this.RULE("program", () => {
        this.MANY(() => this.SUBRULE(this.statement));
        this.MANY1(() => this.CONSUME(Eol));
    });

    private statement = this.RULE("statement", () => {
        this.consumeSeparators();
        this.OR([
            { ALT: () => this.SUBRULE(this.declaration) },
            { ALT: () => this.SUBRULE(this.ifStatement) },
            { ALT: () => this.SUBRULE(this.forStatement) },
            { ALT: () => this.SUBRULE(this.whileStatement) },
            { ALT: () => this.SUBRULE(this.tryStatement) },
            { ALT: () => this.SUBRULE(this.returnStatement) },
            { ALT: () => this.SUBRULE(this.commentStatement) },
            {
                GATE: () => this.LA(2).tokenType === Assign,
                ALT: () => this.SUBRULE(this.assignment),
            },
            { ALT: () => this.SUBRULE(this.expressionStatement) },
        ]);
    });

    private declaration = this.RULE("declaration", () => {
        this.CONSUME(Let);
        this.CONSUME(Identifier);
        this.CONSUME(Assign);
        this.SUBRULE(this.expression);
    });

    private assignment = this.RULE("assignment", () => {
        this.CONSUME(Identifier);
        this.CONSUME(Assign);
        this.SUBRULE(this.expression);
    });

    private expressionStatement = this.RULE("expressionStatement", () => {
        this.SUBRULE(this.expression);
    });

    private ifStatement = this.RULE("ifStatement", () => {
        this.CONSUME(If);
        this.SUBRULE(this.expression);
        this.SUBRULE(this.block);
        this.OPTION({
            GATE: () => this.peekAfterSeparatorsIs(Else),
            DEF: () => {
                this.consumeSeparators();
                this.CONSUME(Else);
                this.SUBRULE1(this.block);
            },
        });
    });

    private forStatement = this.RULE("forStatement", () => {
        this.CONSUME(For);
        this.CONSUME(Identifier);
        this.CONSUME(In);
        this.SUBRULE(this.expression);
        this.SUBRULE(this.block);
    });

    private whileStatement = this.RULE("whileStatement", () => {
        this.CONSUME(While);
        this.SUBRULE(this.expression);
        this.SUBRULE(this.block);
    });

    private tryStatement = this.RULE("tryStatement", () => {
        this.CONSUME(Try);
        this.SUBRULE(this.block);
        this.consumeSeparators();
        this.CONSUME(Catch);
        this.SUBRULE1(this.block);
    });

    private returnStatement = this.RULE("returnStatement", () => {
        this.CONSUME(Return);
        this.OPTION(() => this.SUBRULE(this.expression));
    });

    private commentStatement = this.RULE("commentStatement", () => {
        this.OR([
            { ALT: () => this.CONSUME(LineComment) },
            { ALT: () => this.CONSUME(BlockComment) },
        ]);
    });

    private block = this.RULE("block", () => {
        this.CONSUME(LBrace);
        this.MANY(() => this.SUBRULE(this.statement));
        this.MANY1(() => this.CONSUME(Eol));
        this.CONSUME(RBrace);
    });

    private expression = this.RULE("expression", () => {
        this.SUBRULE(this.logicalOr);
    });

    private lineBreaks = this.RULE("lineBreaks", () => {
        this.MANY(() => this.CONSUME(Eol));
    });

    private logicalOr = this.RULE("logicalOr", () => {
        this.SUBRULE(this.logicalAnd);
        this.MANY(() => {
            this.CONSUME(Or);
            this.SUBRULE1(this.lineBreaks);
            this.SUBRULE2(this.logicalAnd);
        });
    });

    private logicalAnd = this.RULE("logicalAnd", () => {
        this.SUBRULE(this.equality);
        this.MANY(() => {
            this.CONSUME(And);
            this.SUBRULE1(this.lineBreaks);
            this.SUBRULE2(this.equality);
        });
    });

    private equality = this.RULE("equality", () => {
        this.SUBRULE(this.relational);
        this.MANY(() => {
            this.OR([{ ALT: () => this.CONSUME(Eq) }, { ALT: () => this.CONSUME(NotEq) }]);
            this.SUBRULE1(this.lineBreaks);
            this.SUBRULE2(this.relational);
        });
    });

    private relational = this.RULE("relational", () => {
        this.SUBRULE(this.additive);
        this.MANY(() => {
            this.OR([
                { ALT: () => this.CONSUME(Lt) },
                { ALT: () => this.CONSUME(LtEq) },
                { ALT: () => this.CONSUME(Gt) },
                { ALT: () => this.CONSUME(GtEq) },
            ]);
            this.SUBRULE1(this.lineBreaks);
            this.SUBRULE2(this.additive);
        });
    });

    private additive = this.RULE("additive", () => {
        this.SUBRULE(this.multiplicative);
        this.MANY(() => {
            this.OR([{ ALT: () => this.CONSUME(Plus) }, { ALT: () => this.CONSUME(Minus) }]);
            this.SUBRULE1(this.lineBreaks);
            this.SUBRULE2(this.multiplicative);
        });
    });

    private multiplicative = this.RULE("multiplicative", () => {
        this.SUBRULE(this.unary);
        this.MANY(() => {
            this.OR([
                { ALT: () => this.CONSUME(Star) },
                { ALT: () => this.CONSUME(Div) },
                { ALT: () => this.CONSUME(Mod) },
            ]);
            this.SUBRULE1(this.lineBreaks);
            this.SUBRULE2(this.unary);
        });
    });

    private unary = this.RULE("unary", () => {
        this.MANY(() => {
            this.OR([{ ALT: () => this.CONSUME(LogicalNot) }, { ALT: () => this.CONSUME(Minus) }]);
        });
        this.SUBRULE(this.postfix);
    });

    private postfix = this.RULE("postfix", () => {
        this.SUBRULE(this.primary);
        this.MANY(() => {
            this.OR([
                { ALT: () => this.SUBRULE(this.callSuffix) },
                { ALT: () => this.SUBRULE(this.memberSuffix) },
            ]);
        });
    });

    private callSuffix = this.RULE("callSuffix", () => {
        this.CONSUME(LParen);
        this.SUBRULE(this.lineBreaks);
        this.OPTION(() => {
            this.SUBRULE1(this.expression);
            this.MANY(() => {
                this.CONSUME(Comma);
                this.SUBRULE2(this.lineBreaks);
                this.SUBRULE3(this.expression);
            });
        });
        this.SUBRULE4(this.lineBreaks);
        this.CONSUME(RParen);
    });

    private memberSuffix = this.RULE("memberSuffix", () => {
        this.CONSUME(Dot);
        this.CONSUME(Identifier);
    });

    private primary = this.RULE("primary", () => {
        this.OR([
            { ALT: () => this.CONSUME(NumberLiteral) },
            { ALT: () => this.CONSUME(StringLiteral) },
            { ALT: () => this.CONSUME(True) },
            { ALT: () => this.CONSUME(False) },
            { ALT: () => this.CONSUME(Null) },
            { ALT: () => this.CONSUME(Identifier) },
            {
                ALT: () => {
                    this.CONSUME(LParen);
                    this.SUBRULE(this.lineBreaks);
                    this.SUBRULE1(this.expression);
                    this.SUBRULE2(this.lineBreaks);
                    this.CONSUME(RParen);
                },
            },
        ]);
    });
}

export { LineComment };
