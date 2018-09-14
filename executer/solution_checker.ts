import { BaseExecuter } from "./executers/base_executer";
import { CExecuter } from "./executers/c_executer";
import { CPPExecuter } from "./executers/cpp_executer";
import { PyExecuter } from "./executers/py_executer";

import { BaseCompiler } from "./compilers/base_compiler";
import { CCompiler } from "./compilers/c_compiler";
import { CPPCompiler } from "./compilers/cpp_compiler";

import * as fs from "fs";
import path from "path";
import * as shared_types from "../shared/types";
import { TempFile } from "./file_saver";

type Problem = {
    test_cases: Array<{
        input_file: string,
        output: string
    }>,

    time_limit: number
}

let clean_output = (otpt: string): string =>
    otpt.split("\n")
        .map(s => s.trim())
        .filter(s => s != "")
        .join("\n");



export class SolutionChecker {
    protected executers: { [k: string]: BaseExecuter | undefined } = {
        "c": new CExecuter(),
        "cpp": new CPPExecuter(),
        "py": new PyExecuter(),
    };

    protected compilers: { [k: string]: BaseCompiler | undefined } = {
        "c": new CCompiler(),
        "cpp": new CPPCompiler(),
        "py": new BaseCompiler(),
    };

    protected problems: Map<string, Problem>;

    constructor() {
        this.problems = new Map<string, Problem>();
    }

    public load_problems(): void {
        if (process.env.ROOT_DIR == undefined || typeof process.env.ROOT_DIR != "string") {
            throw new Error("ROOT_DIR not set");
        }

        let p_dir = path.join(process.env.ROOT_DIR, "/problems");

        let problem_dirs = fs.readdirSync(p_dir).filter(p =>
            fs.statSync(path.resolve(p_dir, p)).isDirectory()
        );

        for (let prob of problem_dirs) {
            let problem_files = fs.readdirSync(path.join(p_dir, prob));

            // 0 - file index
            // 1 - test case number
            // 2 - in or out
            let test_cases = problem_files
                .map(p => /test-([0-9]+)\.([a-z]+)/g.exec(p))
                .filter(p => p != null);

            let info_file = problem_files
                .filter(p => /problem\.json/g.exec(p))[0];

            if (info_file == null || test_cases.length == 0) {
                throw new Error("Insufficient files for problem: " + prob);
            }

            let problem: Problem = {
                test_cases: [],
                time_limit: -1,
            };

            let info_contents = fs.readFileSync(path.resolve(p_dir, prob, info_file), { encoding: "utf8" });
            let time_limit: number = 0.0;
            try {
                let problem_info = JSON.parse(info_contents);
                if (problem_info.time_limit) {
                    time_limit = parseInt(problem_info.time_limit);
                } else {
                    throw new Error();
                }
            } catch (err) {
                throw new Error("Failed parsing time limit for problem: " + prob);
            }

            problem.time_limit = time_limit;

            test_cases.sort((a, b) =>
                (a ? a[1] : "") < (b ? b[1] : "") ? 0 : 1
            );

            let inputs = test_cases.filter(p => (p ? p[2] : "") === "in");
            let outputs = test_cases.filter(p => (p ? p[2] : "") === "out");

            for (let i of inputs) {
                if (i == undefined) continue;

                let test_case = {
                    input_file: path.resolve(p_dir, prob, i[0]),
                    output: ""
                };

                let output_file = outputs.filter(p => (p ? p[1] : "") == (i ? i[1] : "-1"))[0];
                if (output_file == null) {
                    continue;
                }

                let output_contents = fs.readFileSync(path.resolve(p_dir, prob, output_file[0]), { encoding: "utf8" });

                test_case.output = clean_output(output_contents);

                problem.test_cases.push(test_case);
            }

            this.problems.set(prob, problem);
        }
    }

    public async *process_job(job: shared_types.Job): AsyncIterableIterator<shared_types.JobStatus> {
        let compiler = this.compilers[job.lang];
        if (compiler == undefined) {
            yield { kind: "BAD_LANGUAGE" };
            return;
        }

        yield { kind: "COMPILING" };

        let exec_file: TempFile;
        try {
            exec_file = await compiler.compile(job.code);
        } catch (compile_error) {
            yield { kind: "COMPILE_ERR", err_msg: compile_error };
            return;
        }

        let executer = this.executers[job.lang];
        if (executer == undefined) {
            yield { kind: "BAD_LANGUAGE" };

            exec_file.deleteFile();
            return;
        }

        let problem = this.problems.get(job.problem);
        if (problem == undefined) {
            yield { kind: "BAD_PROBLEM" };

            exec_file.deleteFile();
            return;
        }


        let total = problem.test_cases.length;
        let run_time = 0;
        let completed = 0;

        yield { kind: "RUNNING", completed: 0, total: total, total_run_time: run_time };

        for (let test_case of problem.test_cases) {
            let result = await executer.execute(exec_file.file_path, test_case.input_file, problem.time_limit);

            switch (result.kind) {
                case "OK":
                    //Check output here
                    let output = clean_output(result.val.output);

                    if (output === test_case.output) {
                        completed++;
                        run_time += result.val.run_time;

                        if (completed != total)
                            yield { kind: "RUNNING", completed: completed, total: total, total_run_time: run_time };

                        break;
                    } else {
                        yield { kind: "WRONG_ANSWER", completed: completed, total: total };

                        exec_file.deleteFile();
                        return;
                    }

                case "ERR":
                    exec_file.deleteFile();
                    if (result.val.includes("system")) {
                        yield { kind: "BAD_EXECUTION", completed: completed, total: total };
                    } else {
                        yield { kind: "TIME_LIMIT_EXCEEDED", completed: completed, total: total };
                    }
                    return;
            }
        }

        exec_file.deleteFile();
        yield { kind: "COMPLETED", completed: completed, total: total, total_run_time: run_time };
    }
}