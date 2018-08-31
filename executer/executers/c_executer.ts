import { IExecuter } from "./base_executer";

export class CExecuter implements IExecuter {
	public execute(path: string, inputFile: string): Promise<string> {
		return new Promise((res, _) => res("Test"));
	}
}
