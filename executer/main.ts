import { IExecuter } from "./executers/base_executer";
import { CExecuter } from "./executers/c_executer";
import { CPPExecuter } from "./executers/cpp_executer";
import { PyExecuter } from "./executers/py_executer";

import * as shared_types from "../shared/types";

import * as ipc from "node-ipc";

let executers: { [k: string]: IExecuter | undefined } = {
	"c": new CExecuter(),
	"cpp": new CPPExecuter(),
	"py": new PyExecuter(),
};

function main() {
	ipc.config.id = "cctester";
	ipc.config.retry = 1000;
	
	ipc.connectTo("ccmaster", () => {
		ipc.of.ccmaster.on("cctester.check", (data: shared_types.Problem) => {
			ipc.of.ccmaster.emit("cctester.result", { test: data });
		});

		ipc.of.ccmaster.emit("cctester.connect", {});
	});
}

//function setupRoutes(): express.Router {
//	let router: express.Router = express.Router();
//	router.use(body_parser.json());
//
//	router.post("/check", (req, res) => {
//		let executer = executers[req.body.lang];
//		
//		if (executer == undefined) {
//			res.status(200);
//			res.json({ msg: "BAD LANGUAGE" });
//			return;
//		}
//
//		console.log(req.body.lang);
//		console.log(req.body.code);
//
//		res.status(200);
//		res.json({msg:"NOT IMPLEMENTED YET"});
//	});
//
//	return router;
//}
//
//function main() {
//	app = express();
//
//	app.use("/", setupRoutes());
//	app.listen(4958, () => {
//		console.log("Server listening on 4958");
//	});
//}

main();
