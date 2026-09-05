import type { IToken } from "chevrotain";
import type { SourceLocation } from "./ast.js";

export class LineMap {
    private readonly offsets: number[];
    private readonly sourceLength: number;

    constructor(source: string) {
        const starts = [0];
        for (let i = 0; i < source.length; i++) {
            if (source.charCodeAt(i) === 10) {
                starts.push(i + 1);
            }
        }
        this.offsets = starts;
        this.sourceLength = source.length;
    }

    at(offset: number): { line: number; column: number; offset: number } {
        const safe = Math.max(0, Math.min(offset, this.sourceLength));
        let low = 0;
        let high = this.offsets.length - 1;
        while (low <= high) {
            const mid = (low + high) >> 1;
            if (this.offsets[mid] <= safe) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        const line = Math.max(0, high);
        return {
            line: line + 1,
            column: safe - this.offsets[line] + 1,
            offset: safe,
        };
    }

    locFromOffsets(startOffset: number, endOffset: number): SourceLocation {
        return { start: this.at(startOffset), end: this.at(endOffset) };
    }

    tokenLoc(token: IToken): SourceLocation {
        const end = token.startOffset + token.image.length;
        return this.locFromOffsets(token.startOffset, end);
    }
}

export function span(a: SourceLocation, b: SourceLocation): SourceLocation {
    return { start: a.start, end: b.end };
}
