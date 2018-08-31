import { BaseCompiler, CompilerError } from "./base_compiler";
import { TempFile } from "../file_saver";
import { Result, ERR } from "../../shared/functional_helpers";

import { spawn } from "child_process";


export class CCompiler extends BaseCompiler {
	public compile(code: string): Promise<Result<TempFile, CompilerError>> {
		let sourceFile = new TempFile(code);

		return Promise.resolve(ERR<TempFile, CompilerError>("FAILED TO COMPILE"));;
	}
}
