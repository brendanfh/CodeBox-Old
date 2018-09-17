import express from "express";
import { BaseRenderer } from "./base_renderer";
import { ProblemModel_T } from "../models/problem_model";

interface ProblemExtension extends ProblemModel_T {
    users_side_status: string,
    users_status: string
}

export class ProblemListRenderer extends BaseRenderer {
    public static RENDERER_NAME: string = "ProblemListRenderer";

    public async render(res: express.Response, username: string): Promise<void> {
        let problems = new Array<ProblemExtension>();

        for (let prob of this.scoring_system.get_problems()) {
            problems.push({
                ...prob,
                users_side_status: "",
                users_status: ""
            });
        }

        for (let prob of problems) {
            let side_status = "pending-status";
            let status = "";

            job_for: for (let job of this.job_tracker.get_jobs_by_username_and_problem(username, prob.dir_name)) {
                switch (job.status.kind) {
                    case "COMPLETED":
                        side_status = "good-status";
                        status = "Correct!";
                        break job_for;
                    case "BAD_EXECUTION":
                        side_status = "bad-status";
                        status = "Run-time error";
                        break;
                    case "COMPILE_ERR":
                        side_status = "bad-status";
                        status = "Compile error";
                        break;
                    case "TIME_LIMIT_EXCEEDED":
                        side_status = "bad-status";
                        status = "Time-limit exceeded";
                        break;
                    case "WRONG_ANSWER":
                        side_status = "bad-status";
                        status = "Wrong answer";
                        break;
                    case "RUNNING":
                        status = "Running";
                        break;
                    case "STARTED":
                        status = "Started";
                        break;
                }
            }

            prob.users_side_status = side_status;
            prob.users_status = status;
        }

        res.render("problem/list", {
            navbar: this.get_navbar(this.navbar_tabs.problems, username),
            problems
        });
    }
}