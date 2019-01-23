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
import { GoExecuter } from "./executers/go_executer";
import { GoCompiler } from "./compilers/go_compiler";
import { OutputMatcher } from "./outputs/output_matcher";
import { make_matcher } from "./outputs/matcher_utils";

type ProblemTestCases = Array<{
    input_file: string,
    output: Array<OutputMatcher>
}>

type CheckableProblem
    = { kind: "program" | "golf", test_cases: ProblemTestCases }
    | { kind: "word", answer: OutputMatcher }


let clean_output = (otpt: string): string[] =>
    otpt.split("\n")
        .map(s => s.trim())
        .filter(s => s != "")

let create_matchers = (otpt: string[]): Array<OutputMatcher> =>
    otpt.map(s => make_matcher(s))


export class SolutionChecker {
    protected executers: { [k: string]: BaseExecuter | undefined } = {
        "c": new CExecuter(),
        "cpp": new CPPExecuter(),
        "py": new PyExecuter(),
        "go": new GoExecuter(),
    };

    protected compilers: { [k: string]: BaseCompiler | undefined } = {
        "c": new CCompiler(),
        "cpp": new CPPCompiler(),
        "py": new BaseCompiler(),
        "go": new GoCompiler(),
    };

    protected problems: Map<string, CheckableProblem>;

    constructor() {
        this.problems = new Map<string, CheckableProblem>();
    }

    public load_problems(): void {
        if (process.env.ROOT_DIR == undefined || typeof process.env.ROOT_DIR != "string") {
            throw new Error("ROOT_DIR not set");
        }

        let p_dir = path.join(process.env.ROOT_DIR, "/problems");

        let problem_dirs = fs.readdirSync(p_dir).filter(p =>
            fs.statSync(path.join(p_dir, p)).isDirectory()
        );

        for (let prob of problem_dirs) {
            let problem_files = fs.readdirSync(path.join(p_dir, prob));

            let problem: CheckableProblem;

            if (problem_files.find(s => s == "answer")) {
                let answer = fs.readFileSync(path.resolve(p_dir, prob, "answer"), { encoding: "utf8" });
                let answer_matcher = create_matchers(clean_output(answer))[0];

                problem = {
                    kind: "word",
                    answer: answer_matcher
                }

            } else {
                let problem_test_cases: ProblemTestCases = [];

                // 0 - file index
                // 1 - test case number
                // 2 - in or out
                let test_cases = problem_files
                    .map(p => /test-([0-9]+)\.([a-z]+)/g.exec(p))
                    .filter(p => p != null);

                if (test_cases.length == 0) {
                    throw new Error("Insufficient files for problem: " + prob);
                }

                test_cases.sort((a, b) =>
                    (a ? a[1] : "") < (b ? b[1] : "") ? 0 : 1
                );

                let inputs = test_cases.filter(p => (p ? p[2] : "") === "in");
                let outputs = test_cases.filter(p => (p ? p[2] : "") === "out");

                for (let i of inputs) {
                    if (i == undefined) continue;

                    let test_case = {
                        input_file: path.resolve(p_dir, prob, i[0]),
                        output: new Array<OutputMatcher>()
                    };

                    let output_file = outputs.filter(p => (p ? p[1] : "") == (i ? i[1] : "-1"))[0];
                    if (output_file == null) {
                        continue;
                    }

                    let output_contents = fs.readFileSync(path.resolve(p_dir, prob, output_file[0]), { encoding: "utf8" });

                    let cleaned_output = clean_output(output_contents);
                    let matchers = create_matchers(cleaned_output);

                    test_case.output = matchers;

                    problem_test_cases.push(test_case);
                }

                problem = {
                    kind: "program",
                    test_cases: problem_test_cases
                }
            }

            this.problems.set(prob, problem);
        }
    }

    public async *process_word_job(job: shared_types.Job): AsyncIterableIterator<shared_types.JobStatus> {
        let problem = this.problems.get(job.problem);
        if (problem == undefined || problem.kind != "word") {
            yield { kind: "BAD_PROBLEM" };
            return;
        }

        if (problem.answer.test(job.code)) {
            yield { kind: "COMPLETED", run_times: [], completed: 0, total: 0 };
        } else {
            yield { kind: "WRONG_ANSWER", run_times: [], completed: 0, total: 0 };
        }
    }

    public async *process_code_job(job: shared_types.Job, time_limit: number): AsyncIterableIterator<shared_types.JobStatus> {
        let compiler = this.compilers[job.lang];
        if (compiler == undefined) {
            yield { kind: "BAD_LANGUAGE" };
            return;
        }

        //Wait so the submissions result page looks cooler
        await new Promise((res, rej) => {
            setTimeout(res, 1000);
        });

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
        if (problem == undefined || problem.kind == "word") {
            yield { kind: "BAD_PROBLEM" };

            exec_file.deleteFile();
            return;
        }

        let problem_test_cases = problem.test_cases;

        let total = problem_test_cases.length;
        let run_times = new Array<number>(total);
        let completed = 0;

        yield { kind: "RUNNING", completed: 0, total: total, run_times }

        for (let test_case of problem_test_cases) {
            let result = await executer.execute(exec_file.file_path, test_case.input_file, time_limit);

            switch (result.kind) {
                case "SUCCESS":
                    //Check output here
                    let output = clean_output(result.output);

                    let worked = true;
                    let i = 0;
                    for (let matcher of test_case.output) {
                        if (!matcher.test(output[i])) {
                            worked = false;
                            break;
                        }

                        i++;
                    }

                    if (worked && i != output.length) {
                        worked = false;
                    }

                    if (worked) {
                        run_times[completed] = result.run_time;
                        completed++;

                        if (completed != total)
                            yield { kind: "RUNNING", completed: completed, total: total, run_times };

                        break;
                    } else {
                        run_times[completed] = result.run_time;

                        yield { kind: "WRONG_ANSWER", completed: completed, total: total, run_times };

                        exec_file.deleteFile();
                        return;
                    }

                case "BAD_EXECUTION":
                    exec_file.deleteFile();
                    yield { kind: "BAD_EXECUTION", completed: completed, total: total, run_times };
                    return;

                case "TIME_LIMIT_EXCEEDED":
                    exec_file.deleteFile();
                    yield { kind: "TIME_LIMIT_EXCEEDED", completed: completed, total: total, run_times };
                    return;
            }
        }

        exec_file.deleteFile();
        yield { kind: "COMPLETED", completed: completed, total: total, run_times };
    }

    public async *process_job(job: shared_types.Job, time_limit: number): AsyncIterableIterator<shared_types.JobStatus> {
        if (job.lang == "word") {
            yield* this.process_word_job(job);
        } else {
            yield* this.process_code_job(job, time_limit);
        }
    }
}