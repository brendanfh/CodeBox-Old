import { SolutionChecker } from "./solution_checker";

import * as shared_types from "../shared/types";
import { setupAsyncIterators } from "../shared/utils";

import * as ipc from "node-ipc";
const genUUID = require("uuid/v4");

setupAsyncIterators();

function createJob(sub: shared_types.IPCJobSubmission): shared_types.Job {
	return {
		id: genUUID(),
		status: { kind: "STARTED" },
		username: "JOBS DO NOT NEED USERNAMES",
		problem: sub.problem,
		lang: sub.lang,
		code: sub.code,
		time_initiated: Date.now()
	}
}

function main() {
	let checker = new SolutionChecker();
	checker.load_problems();

	ipc.config.id = "cctester";
	ipc.config.retry = 1000;

	ipc.connectTo("ccmaster", () => {
		ipc.of.ccmaster.on("connect", () => {
			ipc.of.ccmaster.emit("cctester.connect", {});
		});

		ipc.of.ccmaster.on("cctester.create_job", async (vals: { ret_id: string, sub: shared_types.IPCJobSubmission }) => {
			let job: shared_types.Job = createJob(vals.sub);

			ipc.of.ccmaster.emit("cctester.set_job_id", {
				job_id: job.id,
				ret_id: vals.ret_id,
				time: job.time_initiated,
			});

			for await (let update of checker.process_job(job, vals.sub.time_limit)) {
				ipc.of.ccmaster.emit("cctester.job_status_update", {
					job_id: job.id,
					status: update
				});
			}

			ipc.of.ccmaster.emit("cctester.job_completed", { job_id: job.id });
		});
	});
}

main();
