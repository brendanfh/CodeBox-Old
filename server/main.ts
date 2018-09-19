import JobTracker from "./job_tracker";
import WebServer from "./web_server";
import IPCServer from "./ipc_server";
import { Database } from "./database";
import { UserModel } from "./models/user_model";
import ScoringSystem from "./scoring_system";
import { ProblemModel } from "./models/problem_model";

import { setupAsyncIterators } from "../shared/utils";
import { SocketIOServer } from "./socketio_server";
import { JobModel } from "./models/job_model";
import { loadConfig } from "./config_loader";
setupAsyncIterators();


async function setupDatabase(database: Database) {
	await database.initConnection();

	database.addModel(UserModel);
	database.addModel(ProblemModel);
	database.addModel(JobModel);
	await database.setupModels();
}

async function main() {
	let database = new Database();
	await setupDatabase(database);

	let scoring = new ScoringSystem(database);

	let job_tracker = new JobTracker(database);
	let ipc_server = new IPCServer();
	let socket_io_server = new SocketIOServer(job_tracker);

	ipc_server.add_event_listener("cctester.job_status_update", (data, socket) => {
		if (data.job_id != undefined && data.status != undefined) {
			job_tracker.update_job(data.job_id, data.status);
			socket_io_server.push_update(data.job_id, data.status);

			if (data.status.kind != "STARTED"
				|| data.status.kind != "COMPILING"
				|| data.status.kind != "RUNNING")
				scoring.update_problem_stats(data.job_id, job_tracker);
		}
	});

	ipc_server.add_event_listener("cctester.job_completed", (data, socket) => {
		if (data.job_id != undefined) {
			socket_io_server.remove_subscription(data.job_id);
		}
	});

	loadConfig(scoring);

	let web_server = new WebServer(job_tracker, ipc_server, database, scoring);

	ipc_server.init();

	ipc_server.start();
	let http_server = web_server.start();

	socket_io_server.connect_to_http_server(http_server);
	socket_io_server.start_server();
}

main();
