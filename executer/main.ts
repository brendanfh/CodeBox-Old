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


function createJob(sub: shared_types.Submission): shared_types.Job {
	return {
		id: genUUID(),
		status: { kind: "STARTED" },
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

	public async *process_job(job: shared_types.Job): AsyncIterableIterator<shared_types.JobStatus> {
		let sub: shared_types.Submission = job.submission;

		let compiler = this.compilers[sub.lang];
		if (compiler == undefined) {
			yield { kind: "BAD_LANGUAGE" };
			return;
		}

		yield { kind: "COMPILING" };

		try {
			let exec_file = await compiler.compile(sub.code);

			let executer = this.executers[sub.lang];
			if (executer == undefined) {
				yield { kind: "BAD_LANGUAGE" }
				return;
			}

			let inputs = ["proof.js", "proof.js"];
			let total = inputs.length;
			let completed = 0;

			yield { kind: "RUNNING", completed: 0, total: total };

			for (let i of inputs) {
				let result = await executer.execute(exec_file.file_path, i, 200000);

				switch (result.kind) {
					case "JUST":
						completed++;
						yield { kind: "RUNNING", completed: completed, total: total };
						break;

					case "NONE":
						exec_file.deleteFile();

						yield { kind: "TIME_LIMIT_EXCEEDED", completed: completed, total: total };
						return;
				}
			}

			exec_file.deleteFile();

			yield { kind: "COMPLETED", completed: completed, total: total };

		} catch (compile_error) {
			yield { kind: "COMPILE_ERR", err_msg: compile_error };
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
			let job: shared_types.Job = createJob(sub);

			ipc.of.ccmaster.emit("cctester.set_job_id", {
				job_id: job.id,
				submission_id: sub.id
			});

			for await (let update of checker.process_job(job)) {
				ipc.of.ccmaster.emit("cctester.job_status_update", {
					job_id: job.id,
					status: update
				});
			}

			ipc.of.ccmaster.emit("cctester.job_completed", { job_id: job.id });
		});

		ipc.of.ccmaster.emit("cctester.connect", {});
	});
}

main();
