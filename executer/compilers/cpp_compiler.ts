import { BaseCompiler, CompilerError } from "./base_compiler";
import { TempFile } from "../file_saver";
import { Result, ERR, OK } from "../../shared/functional_helpers";

import { spawn } from "child_process";
import * as cph from "../child_process_helpers";

export class CPPCompiler extends BaseCompiler {
	public async compile(code: string): Promise<Result<TempFile, CompilerError>> {
		let sourceFile = new TempFile(code, "cpp");
		let execFile = new TempFile();
		
		let compiler_process = spawn("g++", [sourceFile.file_path, "-o", execFile.file_path]);
		let compiler_output = "";
		compiler_process.stderr.on("data", (data) => compiler_output += data.toString());

		let result_code = await cph.onChildExit(compiler_process);
		console.log(result_code, compiler_output);

		sourceFile.deleteFile();
		if (result_code == 0) {
			//SUCCESSFUL
			return OK<TempFile, CompilerError>(execFile);
		} else {
			//NOT SUCCESSFUL
			return ERR<TempFile, CompilerError>(compiler_output);
		}
	}
}
