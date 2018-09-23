import { OutputMatcher } from "./output_matcher";
import { RegexOutputMatcher } from "./regex_output_matcher";

export function make_matcher(line: string): OutputMatcher {
    let isRegex = /__REGEXP\((.+)\)$/;

    let matchLine = isRegex.exec(line);

    if (matchLine) {
        return new RegexOutputMatcher(matchLine[1]);
    }

    return new OutputMatcher(line);
}
