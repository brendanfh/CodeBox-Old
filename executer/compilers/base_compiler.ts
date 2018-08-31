import { TempFile } from "../file_saver";
import { Result, OK } from "../../shared/functional_helpers";

export type CompilerError = string

export class BaseCompiler {
	public compile(code: string): Promise<Result<TempFile, CompilerError>> {
		return Promise.resolve(
			OK<TempFile, CompilerError>(new TempFile(code))
		);
	}
}
