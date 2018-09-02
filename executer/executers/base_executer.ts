import * as cph from "../child_process_helpers";
import { ChildProcess } from "child_process";
import { Maybe } from "../../shared/functional_helpers";

function promise_timer(time_limit: number): Promise<number> {
	return new Promise((res, rej) => {
		setTimeout(res, time_limit, -1);
	});
}

export abstract class BaseExecuter {
	protected run_timed(child: ChildProcess, time_limit: number): Promise<number> {
		return Promise.race([ cph.onChildExit(child), promise_timer(time_limit) ]);
	}

	public abstract execute(path: string, inputFile: string, time_limit: number): Promise<Maybe<string>>;
}
