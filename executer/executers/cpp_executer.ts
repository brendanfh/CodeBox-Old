import { BaseExecuter, ExecutionResult } from "./base_executer";
import { spawn } from "child_process";
import { onChildExit } from "../child_process_helpers";


export class CPPExecuter extends BaseExecuter {
	public async execute(exec_path: string, input_file: string, time_limit: number): Promise<ExecutionResult> {
		let bash_shell = spawn("bash");

		let output = "";
		bash_shell.stdout.on("data", (data) => output += data.toString());

		let err_output = "";
		bash_shell.stderr.on("data", (data) => err_output += data.toString());

		bash_shell.stdin.end(`cat ${input_file} | timeout -s SIGKILL ${time_limit / 1000.0} ${exec_path}`);

		let start_time = process.hrtime();
		let program_res = await onChildExit(bash_shell);
		let diff_time = process.hrtime(start_time);

		let run_time = diff_time[0] * 1_000_000 + Math.floor(diff_time[1] / 1000) / 1_000_000;

		if (program_res == 0) {
			return { kind: "SUCCESS", output, run_time };
		} else if (program_res == 124 || program_res == 137) {
			bash_shell.kill();

			return { kind: "TIME_LIMIT_EXCEEDED" };
		} else {
			bash_shell.kill();

			return { kind: "BAD_EXECUTION", err: err_output }
		}
	}
}
