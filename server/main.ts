import JobTracker from "./job_tracker";
import WebServer from "./web_server";
import IPCServer from "./ipc_server";
import { Database } from "./database";
import { UserModel } from "./models/user_model";
import ScoringSystem from "./scoring_system";
import { ProblemModel } from "./models/problem_model";

import { setupAsyncIterators } from "../shared/utils";
import { SocketIOServer } from "./socketio_server";
setupAsyncIterators();


async function setupDatabase(database: Database) {
	await database.initConnection();

	database.addModel(new UserModel());
	database.addModel(new ProblemModel());
	await database.setupModels();
}

async function main() {
	let job_tracker = new JobTracker();
	let ipc_server = new IPCServer();

	ipc_server.add_event_listener("cctester.job_status_update", (data, socket) => {
		if (data.job_id != undefined && data.status != undefined) {
			job_tracker.update_job(data.job_id, data.status);
		}
	})

	let database = new Database();
	await setupDatabase(database);

	let scoring = new ScoringSystem(database);
	await scoring.load_problems();

	let socket_io_server = new SocketIOServer(job_tracker);

	ipc_server.add_event_listener("cctester.job_status_update", (data, socket) => {
		if (data.job_id != undefined && data.status != undefined) {
			socket_io_server.push_update(data.job_id, data.status);
		}
	});

	ipc_server.add_event_listener("cctester.job_completed", (data, socket) => {
		if (data.job_id != undefined) {
			socket_io_server.remove_subscription(data.job_id);
		}
	});

	let web_server = new WebServer(job_tracker, ipc_server, database, scoring);

	ipc_server.init();

	ipc_server.start();
	let http_server = web_server.start();

	socket_io_server.connect_to_http_server(http_server);
	socket_io_server.start_server();
}

main();
