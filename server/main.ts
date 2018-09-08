import * as ipc from "node-ipc";
import * as net from "net";
import path from "path";

import express from "express";
import body_parser from "body-parser";

const genUUID = require("uuid/v4");

import * as shared_types from "../shared/types";

class JobTracker {
	private jobs: Map<shared_types.JobID, shared_types.Job>;

	public constructor() {
		this.jobs = new Map<shared_types.JobID, shared_types.Job>();
	}

	public add_job(id: shared_types.JobID, sub: shared_types.Submission) {
		this.jobs.set(id, {
			id: id,
			submission: sub,
			status: { kind: "STARTED" }
		});
	}

	public update_job(id: shared_types.JobID, status: shared_types.JobStatus) {
		let job = this.jobs.get(id);
		if (job == null) return;

		if (job.id != id) return;

		job.status = status;
		this.jobs.set(id, job);
	}

	public get_job(id: shared_types.JobID): shared_types.Job | undefined {
		return this.jobs.get(id);
	}

	public save_to_file(file_path: string) {
		// TODO: Save Jobs to a file
	}
}

let job_tracker = new JobTracker();

class WebServer {
	private expressApp: express.Application;
	private interProcessCommunicator: IPCServer;

	public constructor() {
		this.expressApp = express();
		this.setupApiRoutes();
		this.setupWebRoutes();

		this.interProcessCommunicator = new IPCServer();
		this.interProcessCommunicator.init();
	}

	protected setupApiRoutes() {
		let app = this.expressApp;

		let api = express.Router();
		api.use(body_parser.json());

		api.post("/request_check", async (req, res) => {
			let test: shared_types.Submission = {
				id: genUUID(),
				problem: req.body.problem,
				lang: req.body.lang,
				code: req.body.code
			};

			let succ = this.interProcessCommunicator.request_test(test);
			if (succ) {
				let job_id = await this.interProcessCommunicator.wait_for_job_id(test.id);

				job_tracker.add_job(job_id, test);

				res.status(200);
				res.json({ id: job_id });
			} else {
				res.status(500);
				res.json({ err: "Executer server not connected" });
			}
		});

		api.get("/job_status", async (req, res) => {
			let job_id = req.query.id;

			let job = job_tracker.get_job(job_id);

			if (job == undefined) {
				res.status(500);
				res.json({ err: "Bad id" });
			} else {
				res.status(200);
				res.json(job);
			}
		});

		app.use("/api", api);
	}

	protected setupWebRoutes() {
		let app = this.expressApp;

		app.set('views', path.resolve(process.cwd(), "web/views"));
		app.set('view engine', 'ejs');

		app.use("/static", express.static(path.resolve(process.cwd(), "web/static")));

		app.get("/", (req, res) => {
			res.render("index", { name: "Brendan" });
		});
	}

	public start() {
		const PORT = process.env.PORT || 8000;

		this.expressApp.listen(PORT, () => {
			console.log("Server started and listening on port:", PORT)
		});

		this.interProcessCommunicator.start();
	}
}


class IPCServer {
	protected cctester_socket: net.Socket | null = null;
	protected resolve_map: {
		[k: string]: {
			[k: string]: (n: any) => void
		}
	} = {
			"wait_for_job_id": {},
			"wait_for_job_completion": {}
		};

	public init() {
		ipc.config.id = "ccmaster";
		ipc.config.retry = 5000;

		ipc.serve(this.setupEvents.bind(this));
	}

	protected setupEvents() {
		ipc.server.on("cctester.connect", (data, socket) => {
			this.cctester_socket = socket;
		});

		ipc.server.on("cctester.set_job_id", (data, socket) => {
			if (data.submission_id != undefined && data.job_id != undefined) {
				this.resolve_map["wait_for_job_id"][data.submission_id](data.job_id);
			}
		});

		ipc.server.on("cctester.job_status_update", (data, socket) => {
			if (data.job_id != undefined && data.status != undefined) {
				job_tracker.update_job(data.job_id, data.status);
			}
		});

		ipc.server.on("cctester.job_completed", (data, socket) => {
			if (data.job_id != undefined &&
				this.resolve_map["wait_for_job_completion"][data.job_id] != undefined) {
				this.resolve_map["wait_for_job_completion"][data.job_id](void 0);
			}
		});
	}

	//Returns whether or not it has a connected ipc-socket
	public request_test(sub: shared_types.Submission): boolean {
		if (this.cctester_socket == null) {
			return false;
		}

		ipc.server.emit(this.cctester_socket, "cctester.create_job", sub)
		return true;
	}

	public wait_for_job_id(sub_id: string): Promise<shared_types.JobID> {
		return new Promise((res, rej) => {
			this.resolve_map["wait_for_job_id"][sub_id] = res;
		});
	}

	public wait_for_job_completion(id: string): Promise<number> {
		return new Promise((res, rej) => {
			this.resolve_map["wait_for_job_completion"][id] = res;
		});
	}

	public start() {
		ipc.server.start();
	}

	public stop() {
		ipc.server.stop();
	}
}

function main() {
	new WebServer().start();
}

main();
