import * as ipc from "node-ipc";
import * as net from "net";

import express from "express";
import body_parser from "body-parser";

const genUUID = require("uuid/v4");

import * as shared_types from "../shared/types";

class WebServer {
	private expressApp: express.Application;
	private interProcessCommunicator: IPCServer;

	public constructor() {
		this.expressApp = express();
		this.setupMiddleware();
		this.setupRoutes();

		this.interProcessCommunicator = new IPCServer();
		this.interProcessCommunicator.init();
	}

	protected setupMiddleware() {
		this.expressApp.use(body_parser.json())
	}

	protected setupRoutes() {
		let app = this.expressApp;

		app.post("/check_problem", async (req, res) => {
			let test: shared_types.Submission = {
				id: genUUID(),
				problem: req.body.problem,
				lang: req.body.lang,
				code: req.body.code
			};

			let succ = this.interProcessCommunicator.requestTest(test);
			if (succ) {
				await this.interProcessCommunicator.waitForTestCompletion(test.id);

				res.status(200);
				res.json({ msg: "NOT IMPLEMENTED YET" });
			} else {
				res.status(500);
				res.json({ err: "ERROR" });
			}
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
	protected resolve_map: { [k: string]: (n: number) => void } = {};

	public init() {
		ipc.config.id = "ccmaster";
		ipc.config.retry = 5000;

		ipc.serve(this.setupEvents.bind(this));
	}

	protected setupEvents() {
		ipc.server.on("cctester.connect", (data, socket) => {
			this.cctester_socket = socket;
		});

		ipc.server.on("cctester.job_completed", (data, socket) => {
			if (data.test != undefined && data.test.id != undefined) {
				this.resolve_map[data.test.id](1);
			}
		});
	}

	public requestTest(test: shared_types.Submission): boolean {
		if (this.cctester_socket == null) {
			return false;
		}

		ipc.server.emit(this.cctester_socket, "cctester.create_job", test)
		return true;
	}

	public waitForTestCompletion(id: string): Promise<number> {
		return new Promise((res, rej) => {
			this.resolve_map[id] = res;
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
