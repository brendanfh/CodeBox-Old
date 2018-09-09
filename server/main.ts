import JobTracker from "./job_tracker";
import WebServer from "./web_server";
import IPCServer from "./ipc_server";
import { Database } from "./database";
import { UserModel } from "./models/user_model";


async function setupDatabase(database: Database) {
	await database.initConnection();

	database.addModel(new UserModel());
	await database.setupModels();
}


async function main() {
	let job_tracker = new JobTracker();
	let ipc_server = new IPCServer(job_tracker);
	let web_server = new WebServer(job_tracker, ipc_server);

	let database = new Database();
	await setupDatabase(database);

	ipc_server.init();

	ipc_server.start();
	web_server.start();
}

main();
