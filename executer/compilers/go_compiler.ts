import { TempFile } from "../file_saver";

export type CompilerError = string

export class GoCompiler {
    public compile(code: string): Promise<TempFile> {
        return Promise.resolve(new TempFile(code, "go"));
    }
}
