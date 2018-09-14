import JobTracker from "./job_tracker";
import WebServer from "./web_server";
import IPCServer from "./ipc_server";
import { Database } from "./database";
import { UserModel } from "./models/user_model";
import ScoringSystem from "./scoring_system";
import { ProblemModel } from "./models/problem_model";

import { setupAsyncIterators } from "../shared/utils";
setupAsyncIterators();


async function setupDatabase(database: Database) {
	await database.initConnection();

	database.addModel(new UserModel());
	database.addModel(new ProblemModel());
	await database.setupModels();
}

async function main() {
	let job_tracker = new JobTracker();
	let ipc_server = new IPCServer(job_tracker);

	let database = new Database();
	await setupDatabase(database);

	let scoring = new ScoringSystem(database);
	await scoring.load_problems();

	let web_server = new WebServer(job_tracker, ipc_server, database, scoring);

	ipc_server.init();

	ipc_server.start();
	web_server.start();
}

main();
