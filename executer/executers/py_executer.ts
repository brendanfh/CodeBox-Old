import { BaseExecuter } from "./base_executer";
import { Maybe, JUST, NONE } from "../../shared/functional_helpers";

export class PyExecuter extends BaseExecuter {
	public async execute(path: string, inputFile: string, time_limit: number): Promise<Maybe<string>> {
		return JUST("");	
	}
}
