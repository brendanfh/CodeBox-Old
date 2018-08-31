import { IExecuter } from "./executers/base_executer";
import { CExecuter } from "./executers/c_executer";
import { CPPExecuter } from "./executers/cpp_executer";
import { PyExecuter } from "./executers/py_executer";

import * as shared_types from "../shared/types";

import * as ipc from "node-ipc";

let executers: { [k: string]: IExecuter | undefined } = {
	"c": new CExecuter(),
	"cpp": new CPPExecuter(),
	"py": new PyExecuter(),
};

function main() {
	ipc.config.id = "cctester";
	ipc.config.retry = 1000;
	
	ipc.connectTo("ccmaster", () => {
		ipc.of.ccmaster.on("cctester.check", (data: shared_types.Problem) => {
			ipc.of.ccmaster.emit("cctester.result", { test: data });
		});

		ipc.of.ccmaster.emit("cctester.connect", {});
	});
}

main();
