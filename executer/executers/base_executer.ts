import { Result } from "../../shared/functional_helpers";

export type ExecutionResult
	= { kind: "SUCCESS", output: string, run_time: number }
	| { kind: "BAD_EXECUTION", err: string }
	| { kind: "TIME_LIMIT_EXCEEDED" }

export abstract class BaseExecuter {
	public abstract execute(path: string, input_file: string, time_limit: number): Promise<ExecutionResult>;
}
