import { SolutionChecker } from "./solution_checker";

import * as shared_types from "../shared/types";
import { setupAsyncIterators } from "../shared/utils";

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

function main() {
	let checker = new SolutionChecker();
	checker.load_problems();

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
