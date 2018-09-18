import express from "express";
import { BaseRenderer } from "./base_renderer";
import * as shared_types from "../../shared/types";

export class SubmissionListRenderer extends BaseRenderer {
    public static RENDERER_NAME: string = "SubmissionListRenderer";

    private helpful_funcs() {
        let self = this;
        return {
            submission_status_class(status: shared_types.JobStatus) {
                let output = "submission-status ";

                switch (status.kind) {
                    case "BAD_EXECUTION":
                    case "BAD_LANGUAGE":
                    case "BAD_PROBLEM":
                    case "COMPILE_ERR":
                    case "TIME_LIMIT_EXCEEDED":
                    case "WRONG_ANSWER":
                        output += "bad-status";
                        break;

                    case "COMPLETED":
                        output += "good-status";
                        break;

                    default:
                        output += "pending-status";
                }

                return output;
            },

            get_problem_name(problem_dir_name: string) {
                let problem = self.scoring_system.get_problem(problem_dir_name);
                if (problem == null) return "---------";

                return problem.name;
            },

            get_job_status(kind: string) {
                switch (kind) {
                    case "BAD_EXECUTION":
                        return "Run-time error";
                    case "TIME_LIMIT_EXCEEDED":
                        return "Time-limit exceeded";
                    case "WRONG_ANSWER":
                        return "Wrong answer";
                    case "COMPILE_ERR":
                        return "Compile error";
                    case "COMPLETED":
                        return "Success";
                    case "STARTED":
                        return "Started";
                    case "RUNNING":
                        return "Running";
                    default:
                        return "";
                }
            },

            get_language_name: self.get_language_name,

            get_running_time(status: shared_types.JobStatus) {
                switch (status.kind) {
                    case "RUNNING":
                    case "COMPLETED":
                        let run_sum = status.run_times.reduce((a, b) => a + b);
                        return `${(run_sum / 1_000_000).toFixed(3)}s`

                    default:
                        return "-.---s";
                }
            },

            format_time(time: number) {
                let d = new Date(time);

                return d.toLocaleTimeString();
            }
        }
    }

    public async render(res: express.Response, username: string, problem?: string | undefined): Promise<void> {
        let sidebar_problems = await this.get_sidebar_problems(username);

        let page_title = "Submissions";
        if (problem != undefined) {
            let prob = this.scoring_system.get_problem(problem);
            if (prob != undefined) {
                page_title = prob.name + " submissions";
            }
        }

        let gen_jobs = this.job_tracker.get_jobs_by_username(username);
        let jobs = new Array<shared_types.Job>();
        for await (let j of gen_jobs) {
            if (problem) {
                if (j.problem == problem)
                    jobs.push(j);
            } else {
                jobs.push(j);
            }
        }

        jobs = jobs.sort((a, b) => b.time_initiated - a.time_initiated);

        let help_funcs = this.helpful_funcs();

        res.render("submissions/submissions", {
            navbar: this.get_navbar(this.navbar_tabs.submissions, username),
            jobs,
            problem: {
                dir_name: problem,
                name: page_title
            },
            sidebar_problems,
            sidebar_href(dir_name: string) {
                return `/submissions?problem=${dir_name}`;
            },
            helpful_funcs: help_funcs
        })
    }
}