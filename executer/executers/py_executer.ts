import { BaseExecuter, ExecutionResult } from "./base_executer";
import { Result, OK } from "../../shared/functional_helpers";

export class PyExecuter extends BaseExecuter {
	public async execute(path: string, inputFile: string, time_limit: number): Promise<Result<ExecutionResult, string>> {
		return OK({ output: "", run_time: -1 });
	}
}
