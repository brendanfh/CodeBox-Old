import { Result } from "../../shared/functional_helpers";

export type ExecutionResult = {
	output: string,
	run_time: number
}

export abstract class BaseExecuter {
	public abstract execute(path: string, input_file: string, time_limit: number): Promise<Result<ExecutionResult, string>>;
}
