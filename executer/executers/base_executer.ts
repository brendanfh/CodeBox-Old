import { Result } from "../../shared/functional_helpers";


export abstract class BaseExecuter {
	public abstract execute(path: string, input_file: string, time_limit: number): Promise<Result<string, string>>;
}
