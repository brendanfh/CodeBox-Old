import { BaseCompiler, CompilerError } from "./base_compiler";
import { TempFile } from "../file_saver";

import { spawn } from "child_process";
import * as cph from "../child_process_helpers";

export class CPPCompiler extends BaseCompiler {
	public async compile(code: string): Promise<TempFile> {
		let sourceFile = new TempFile(code, "cpp");
		let execFile = new TempFile();

		let compiler_process = spawn("g++", [
			"-w",
			"-O2",
			sourceFile.file_path,
			"./executer/compilers/secure/seccomp.c",
			"-lseccomp",
			"-o",
			execFile.file_path
		]);

		let compiler_output = "";
		compiler_process.stderr.on("data", (data) => compiler_output += data.toString());

		let result_code = await cph.onChildExit(compiler_process);

		sourceFile.deleteFile();
		if (result_code == 0) {
			//SUCCESSFUL
			return execFile;
		} else {
			execFile.deleteFile();
			//NOT SUCCESSFUL
			throw compiler_output;
		}
	}
}
