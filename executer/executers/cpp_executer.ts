import { BaseExecuter } from "./base_executer";
import { spawn } from "child_process";
import { Result, OK, ERR } from "../../shared/functional_helpers";
import { onChildExit } from "../child_process_helpers";


export class CPPExecuter extends BaseExecuter {
	public async execute(exec_path: string, input_file: string, time_limit: number): Promise<Result<string, string>> {
		let bash_shell = spawn("bash");

		let output = "";
		bash_shell.stdout.on("data", (data) => output += data.toString());

		let err_output = "";
		bash_shell.stderr.on("data", (data) => err_output += data.toString());

		bash_shell.stdin.end(`cat ${input_file} | timeout -s SIGKILL ${time_limit / 1000.0} ${exec_path}`);

		let program_res = await onChildExit(bash_shell);

		if (program_res == 0) {
			return OK(output);
		} else {
			bash_shell.kill();

			if (err_output.includes("Bad system call") !== false) {
				return ERR("Unpermitted system call detected");
			}

			return ERR(err_output);
		}
	}
}
