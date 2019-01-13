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
import { loadConfig } from "./config";
setupAsyncIterators();

import { Kernel } from "../shared/injection/injection";
import { Emailer } from "./emailer";


async function setupDatabase(database: Database) {
	await database.initConnection();

	database.addModel(UserModel);
	database.addModel(ProblemModel);
	database.addModel(JobModel);
	await database.setupModels();
}

function bindStatics(kernel: Kernel) {
	kernel.bindStatic<IPCServer>("IPCServer")(IPCServer);
	kernel.bindStatic<JobTracker>("JobTracker")(JobTracker);
	kernel.bindStatic<ScoringSystem>("ScoringSystem")(ScoringSystem);
	kernel.bindStatic<SocketIOServer>("SockerIOServer")(SocketIOServer);
	kernel.bindStatic<WebServer>("WebServer")(WebServer);
	kernel.bindStatic<Emailer>("Emailer")(Emailer);
}

async function setup(kernel: Kernel) {
	let job_tracker = kernel.get<JobTracker>("JobTracker");
	let scoring = kernel.get<ScoringSystem>("ScoringSystem");
	let socket_io_server = kernel.get<SocketIOServer>("SockerIOServer");
	let ipc_server = kernel.get<IPCServer>("IPCServer");

	ipc_server.add_event_listener("cctester.job_status_update", async (data, socket) => {
		if (data.job_id != undefined && data.status != undefined) {
			//Tell the result screen of the changes
			socket_io_server.push_submission_update(data.job_id, data.status);

			//Update the database with the job
			await job_tracker.update_job(data.job_id, data.status);

			//Update the stats of the problem
			if (data.status.kind != "STARTED"
				&& data.status.kind != "COMPILING"
				&& data.status.kind != "RUNNING") {
				await scoring.update_problem_stats(data.job_id);

				let j = await job_tracker.get_job(data.job_id);
				if (j == null) return;

				await scoring.score_user(j.username);
				socket_io_server.push_leaderboard_update();
			}
		}
	});

	ipc_server.add_event_listener("cctester.job_completed", (data, socket) => {
		if (data.job_id != undefined) {
			socket_io_server.remove_submission_subscription(data.job_id);
		}
	});

	ipc_server.init();

	kernel.get<WebServer>("WebServer");
	await loadConfig(kernel);

	let users = kernel.get<UserModel>("UserModel");
	let usernames = await users.getAllUsernames();
	await scoring.score_all_users(usernames);
}

async function start(kernel: Kernel) {
	let socket_io_server = kernel.get<SocketIOServer>("SockerIOServer");
	let ipc_server = kernel.get<IPCServer>("IPCServer");
	let web_server = kernel.get<WebServer>("WebServer");

	ipc_server.start();
	let [http_server, https_server] = web_server.start();

	if (http_server)
		socket_io_server.connect_to_http_server(http_server);
	if (https_server)
		socket_io_server.connect_to_https_server(https_server);

	socket_io_server.start_server();
}

async function main() {
	let kernel = new Kernel();

	bindStatics(kernel);

	let database = new Database();
	await setupDatabase(database);

	kernel.setStatic<Database>("Database")(database);
	kernel.setStatic<JobModel>("JobModel")(database.getModel(JobModel));
	kernel.setStatic<ProblemModel>("ProblemModel")(database.getModel(ProblemModel));
	kernel.setStatic<UserModel>("UserModel")(database.getModel(UserModel));

	await setup(kernel);
	await start(kernel);
}

main();
