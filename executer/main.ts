import { BaseExecuter } from "./executers/base_executer";
import { CExecuter } from "./executers/c_executer";
import { CPPExecuter } from "./executers/cpp_executer";
import { PyExecuter } from "./executers/py_executer";

import { BaseCompiler } from "./compilers/base_compiler";
import { CCompiler } from "./compilers/c_compiler";
import { CPPCompiler } from "./compilers/cpp_compiler";

import * as shared_types from "../shared/types";
import { setupAsyncIterators } from "../shared/utils";
import * as fh from "../shared/functional_helpers";

import * as ipc from "node-ipc";
const genUUID = require("uuid/v4");

setupAsyncIterators();

type Job = {
	id: string,
	status: shared_types.JobStatus,
	submission: shared_types.Submission
}

function createJob(sub: shared_types.Submission): Job {
	return {
		id: genUUID(),
		status: "started",
		submission: sub
	}
}

class Checker {
	protected executers: { [k: string]: BaseExecuter | undefined } = {
		"c": new CExecuter(),
		"cpp": new CPPExecuter(),
		"py": new PyExecuter(),
	};

	protected compilers: { [k: string]: BaseCompiler | undefined } = {
		"c": new CCompiler(),
		"cpp": new CPPCompiler(),
		"py": new BaseCompiler(),
	};

	constructor() {
		//Load problems up here
	}

	public async *process_job(job: Job): AsyncIterableIterator<shared_types.CheckerUpdate> {
		let sub: shared_types.Submission = job.submission;

		let compiler = this.compilers[sub.lang];
		if (compiler == undefined) {
			yield { kind: "BAD_LANGUAGE", job_id: job.id }
			return;
		}

		yield { kind: "STATUS_UPDATE", status: "compiling" };

		try {
			let exec_file = await compiler.compile(sub.code);

			let executer = this.executers[sub.lang];
			if (executer == undefined) {
				yield { kind: "BAD_LANGUAGE", job_id: job.id }
				return;
			}

			yield { kind: "STATUS_UPDATE", status: "running" };

			let inputs = [ "proof.js", "proof.js" ];
			let total = inputs.length;
			let completed = 0;

			for (let i of inputs) {
				let result = await executer.execute(exec_file.file_path, i, 500);

				switch (result.kind) {
					case "JUST":
						completed++;
						yield { kind: "COMPLETION_UPDATE", job_id: job.id, completed: completed, total: total };
						break;

					case "NONE":
						exec_file.deleteFile();

						yield { kind: "TIME_LIMIT_EXCEEDED", job_id: job.id, completed: completed, total: total };
						return;
				}
			}

			exec_file.deleteFile();

			yield { kind: "STATUS_UPDATE", status: "completed" };

		} catch (compile_error) {
			yield { kind: "COMPILE_ERR", job_id: job.id, err_msg: compile_error };
			return;
		}
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
				//ipc.of.ccmaster.emit("cctester.job_status_update", update);
			}

			ipc.of.ccmaster.emit("cctester.job_completed", { job_id: job.id });
		});

		ipc.of.ccmaster.emit("cctester.connect", {});
	});
}

main();
