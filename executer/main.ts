import { BaseExecuter } from "./executers/base_executer";
import { CExecuter } from "./executers/c_executer";
import { CPPExecuter } from "./executers/cpp_executer";
import { PyExecuter } from "./executers/py_executer";

import { BaseCompiler } from "./compilers/base_compiler";
import { CCompiler } from "./compilers/c_compiler";
import { CPPCompiler } from "./compilers/cpp_compiler";

import * as shared_types from "../shared/types";
import { setupAsyncIterators } from "../shared/utils";

import * as ipc from "node-ipc";
const genUUID = require("uuid/v4");

setupAsyncIterators();

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

type Job = {
	id: string,
	status: "open" | "running" | "closed",
	submission: shared_types.Submission
}

function createJob(sub: shared_types.Submission): Job {
	return {
		id: genUUID(),
		status: "open",
		submission: sub
	}
}

type CheckerUpdate
	= { kind: "COMPLETION_UPDATE", job_id: string, completed: number, total: number }
	| { kind: "COMPILE_ERR", job_id: string, err_msg: string }
	| { kind: "WRONG_ANSWER", job_id: string, completed: number, total: number }
	| { kind: "TIME_LIMIT_EXCEEDED", job_id: string, completed: number, total: number }

class Checker {
	constructor() {

	}

	public async *process_job(job: Job): AsyncIterableIterator<CheckerUpdate> {
		yield {
			kind: "COMPLETION_UPDATE",
			job_id: job.id,
			completed: 0,
			total: 0,
		};
	}
}


function main() {
	let checker = new Checker();

	ipc.config.id = "cctester";
	ipc.config.retry = 1000;

	ipc.connectTo("ccmaster", () => {
		ipc.of.ccmaster.on("cctester.create_job", async (sub: shared_types.Submission) => {
			let job: Job = createJob(sub);

			ipc.of.ccmaster.emit("cctester.set_job_id", {
				job_id: job.id,
				submission_id: sub.id
			});

			for await (let update of checker.process_job(job)) {
				console.log("Got", update);
				ipc.of.ccmaster.emit("cctester.job_status_update", update);
			}

			//let compiler = compilers[data.lang];
			//if (compiler == undefined) return;

			//let maybeExecFile = await compiler.compile(data.code);

			//switch (maybeExecFile.kind) {
			//	case "OK": {
			//		let executer = executers[data.lang];
			//		if (executer == undefined) return;

			//		let result = await executer.execute(maybeExecFile.val.file_path, "NOPE", 2100);
			//		console.log("OUTPUT WAS", result);
			//		maybeExecFile.val.deleteFile();

			//		ipc.of.ccmaster.emit("cctester.result", { test: data });
			//		break;
			//	}
			//	case "ERR": {
			//		ipc.of.ccmaster.emit("cctester.result", { err: "failed to compile", reason: maybeExecFile.val });
			//		break;
			//	}
			//}

		});

		ipc.of.ccmaster.emit("cctester.connect", {});
	});
}

main();
