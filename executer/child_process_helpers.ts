import * as cp from "child_process";

export function onChildExit(childProc: cp.ChildProcess): Promise<number> {
	return new Promise((res, rej) => {
		childProc.on("exit", (code) => {
			if (code == null)
				rej(-1);
			else
				res(code);
		});
	});
}
