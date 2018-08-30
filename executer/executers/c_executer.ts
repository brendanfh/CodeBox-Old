import { IExecuter } from "./base_executer";

export class CExecuter implements IExecuter {
	public execute(): Promise<void> {
		console.log("HOOP LA");
		return new Promise((res, _) => res(void 1));
	}
}
