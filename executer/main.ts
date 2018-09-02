import { BaseExecuter } from "./executers/base_executer";
import { CExecuter } from "./executers/c_executer";
import { CPPExecuter } from "./executers/cpp_executer";
import { PyExecuter } from "./executers/py_executer";

import { BaseCompiler } from "./compilers/base_compiler";
import { CCompiler } from "./compilers/c_compiler";
import { CPPCompiler } from "./compilers/cpp_compiler";

import * as shared_types from "../shared/types";

import * as ipc from "node-ipc";

let executers: { [k: string]: BaseExecuter | undefined } = {
	"c": new CExecuter(),
	"cpp": new CPPExecuter(),
	"py": new PyExecuter(),
};

let compilers: { [k: string]: BaseCompiler | undefined } = {
	"c": new CCompiler(),
	"cpp": new CPPCompiler(),
	"py": new BaseCompiler(),
};

function main() {
	ipc.config.id = "cctester";
	ipc.config.retry = 1000;
	
	ipc.connectTo("ccmaster", () => {
		ipc.of.ccmaster.on("cctester.check", async (data: shared_types.Problem) => {
			let compiler = compilers[data.lang];
			if (compiler == undefined) return;

			let maybeExecFile = await compiler.compile(data.code);

			switch (maybeExecFile.kind) {
				case "OK": {
					let executer = executers[data.lang];
					if (executer == undefined) return;

					let result = await executer.execute(maybeExecFile.val.file_path, "NOPE", 2100);
					console.log("OUTPUT WAS", result);
					maybeExecFile.val.deleteFile();

					ipc.of.ccmaster.emit("cctester.result", { test: data });
					break;
				}
				case "ERR": {
					ipc.of.ccmaster.emit("cctester.result", { err: "failed to compile", reason: maybeExecFile.val });
					break;
				}
			}
			
		});

		ipc.of.ccmaster.emit("cctester.connect", {});
	});
}

main();
