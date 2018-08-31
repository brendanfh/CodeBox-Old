import { IExecuter } from "./executers/base_executer";
import { CExecuter } from "./executers/c_executer";

import express from 'express';
import body_parser from 'body-parser';

let app: express.Application;

let executers: { [k: string]: IExecuter | undefined } = {
	"c": new CExecuter(),
};

function setupRoutes(): express.Router {
	let router: express.Router = express.Router();
	router.use(body_parser.json());

	router.post("/check", (req, res) => {
		let executer = executers[req.body.lang];
		
		if (executer == undefined) {
			res.status(200);
			res.json({ msg: "BAD LANGUAGE" });
			return;
		}

		console.log(req.body.lang);
		console.log(req.body.code);

		res.status(200);
		res.json({msg:"NOT IMPLEMENTED YET"});
	});

	return router;
}

function main() {
	app = express();

	app.use("/", setupRoutes());
	app.listen(4958, () => {
		console.log("Server listening on 4958");
	});
}

main();
