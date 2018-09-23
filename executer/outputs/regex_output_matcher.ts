import { OutputMatcher } from "./output_matcher";


export class RegexOutputMatcher extends OutputMatcher {
    private regex: RegExp;

    public constructor(line: string) {
        super("");
        this.regex = new RegExp(line);
    }

    public test(str: string): boolean {
        return this.regex.test(str);
    }
}