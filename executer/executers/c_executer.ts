import { BaseExecuter } from "./base_executer";
import { spawn } from "child_process";
import { Maybe, JUST, NONE } from "../../shared/functional_helpers";


export class CExecuter extends BaseExecuter {
	public async execute(exec_path: string, input_file: string, time_limit: number): Promise<Maybe<string>> {
		let bash_shell = spawn("bash");

		let output = "";
		bash_shell.stdout.on("data", (data) => output += data.toString());

		bash_shell.stdin.end(`${exec_path}`);

		let program_res = await this.run_timed(bash_shell, time_limit);

		if (program_res == 0) {
			return JUST<string>(output);
		} else {
			bash_shell.kill();

			return NONE<string>();
		}
	}
}
