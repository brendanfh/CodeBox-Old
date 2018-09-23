// Determines if a single line of output is right
export class OutputMatcher {

    private line: string = "";
    public constructor(line: string) {
        this.line = line;
    }

    public test(str: string): boolean {
        return str === this.line;
    }
}