# skit-parser

Standalone tokenizer and parser for SKIT (Structured Kernel for Implementation Templates) source, built on [Chevrotain](https://chevrotain.io/).

SKIT is a minimal, language-independent pattern language that describes computational structure. It captures the logic of an implementation while delegating low-level details to **generation directives** — comments that carry intent for a downstream code generator.

## Install

```bash
npm install skit-parser
```

## Quick start

```ts
import { parseSkit } from "skit-parser";

const source = `
let values = get_values()

// gen: compute the average of @values and store it in $mean

if mean > 0 {
    for item in values {
        process(item)
    }
} else {
    return null
}
`;

const { ast, errors } = parseSkit(source);

if (errors.length > 0) {
    console.error(errors);
} else {
    console.log(ast.statements);
}
```

## Language

SKIT supports a small set of statements and expressions. Whitespace is not semantically significant — blocks are always delimited by `{ }`.

### Statements

| Statement     | Syntax                                   |
| ------------- | ---------------------------------------- |
| Declaration   | `let name = expression`                  |
| Assignment    | `name = expression`                      |
| If/else       | `if expression { … } else { … }`         |
| For…in        | `for variable in iterable { … }`         |
| While         | `while expression { … }`                 |
| Try/catch     | `try { … } catch { … }`                  |
| Return        | `return expression` (or bare `return`)   |
| Expression    | Any expression as a standalone statement |
| Comment       | `// …` or `/* … */`                      |
| Gen directive | `// gen: …` or `/* gen: … */`            |

### Expressions

Literals (`42`, `"hello"`, `true`, `false`, `null`), identifiers, member access (`obj.prop`), function calls (`fn(a, b)`), arithmetic (`+ - * / %`), comparison (`< <= > >=`), equality (`== !=`), logical (`&& || !`), unary (`-`, `!`), and parenthesised grouping — with standard precedence.

### Generation directives

A comment whose body starts with `gen:` becomes a `GenerationDirective` AST node. Two marker types are recognised inside the body:

- **`@identifier`** — references an existing variable.
- **`$identifier`** — declares a new binding.

```ts
// gen: split @data into $train and $test
```

```ts
/*
gen:
    compute the average of @values
    and store it in $mean
*/
```

The parser extracts `instruction`, `references` and `bindings` but does **not** perform scope validation.

## AST

`parseSkit` returns a `ParseResult`:

```ts
interface ParseResult {
    ast: Program | undefined;
    errors: ParserError[];
}
```

Key AST types (all include a `loc: SourceLocation`):

```
Program
  └── statements: Statement[]

Statement =
  | LetStatement        { name, value }
  | AssignmentStatement { name, value }
  | ExpressionStatement { expression }
  | IfStatement         { condition, consequent, alternate? }
  | ForStatement        { variable, iterable, body }
  | WhileStatement      { condition, body }
  | TryStatement        { body, handler }
  | ReturnStatement     { argument? }
  | Comment             { text }
  | GenerationDirective { instruction, references[], bindings[] }

Expression =
  | LiteralExpression    { kind, value, raw }
  | IdentifierExpression { name }
  | CallExpression       { callee, arguments[] }
  | MemberExpression     { object, property }
  | UnaryExpression      { operator, argument }
  | BinaryExpression     { operator, left, right }
```

## Development

```bash
npm run build          # compile to dist/
npm run typecheck      # type-check only
npm test               # run tests
npm run test:watch     # watch mode
npm run format         # auto-format
npm run format:check   # check formatting
npm run clean          # remove dist/
```

## License

UNLICENSED
