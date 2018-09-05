import { TempFile } from "../file_saver";
import { Result, OK } from "../../shared/functional_helpers";

export type CompilerError = string

export class BaseCompiler {
	public compile(code: string): Promise<TempFile> {
		return Promise.resolve(new TempFile(code));
	}
}
