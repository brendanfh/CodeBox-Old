import * as cp from "child_process";

export function onChildExit(childProc: cp.ChildProcess): Promise<number> {
	return new Promise((res, rej) => {
		childProc.on("exit", (code) => {
			res(code);
		});
	});
}
