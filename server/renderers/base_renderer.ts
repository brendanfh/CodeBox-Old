import express from "express";

import JobTracker from "../job_tracker";
import ScoringSystem from "../scoring_system";
import { Database } from "../database";

export type NavbarData = {
    selected_tab: number;
    username: string | undefined
}

export abstract class BaseRenderer {
    protected navbar_tabs = {
        "leaderboard": 0,
        "problems": 1,
        "submissions": 2,
        "help": 3,
    }

    protected job_tracker: JobTracker;
    protected scoring_system: ScoringSystem;
    protected database: Database;

    public constructor(jt: JobTracker, ss: ScoringSystem, db: Database) {
        this.job_tracker = jt;
        this.scoring_system = ss;
        this.database = db;
    }

    public abstract async render(res: express.Response, ...args: any[]): Promise<void>;

    //Helper Functions used in routes
    protected async get_sidebar_problems(username: string) {
        let sidebar_problems = [];

        let all_problems = this.scoring_system.get_problems();
        for (let prob of all_problems) {
            let hasCompleted = false;
            let hasWrong = false;

            for await (let _ of this.job_tracker.get_jobs_by_all(username, prob.dir_name, "COMPLETED")) {
                hasCompleted = true;
                break;
            }

            wrong_check: {
                for await (let _ of this.job_tracker.get_jobs_by_all(username, prob.dir_name, "WRONG_ANSWER")) {
                    hasWrong = true;
                    break wrong_check;
                }
                for await (let _ of this.job_tracker.get_jobs_by_all(username, prob.dir_name, "TIME_LIMIT_EXCEEDED")) {
                    hasWrong = true;
                    break wrong_check;
                }
                for await (let _ of this.job_tracker.get_jobs_by_all(username, prob.dir_name, "BAD_EXECUTION")) {
                    hasWrong = true;
                    break wrong_check;
                }
                for await (let _ of this.job_tracker.get_jobs_by_all(username, prob.dir_name, "COMPILE_ERR")) {
                    hasWrong = true;
                    break wrong_check;
                }
            }

            sidebar_problems.push({
                name: prob.name,
                dir_name: prob.dir_name,
                completed: hasCompleted,
                wrong_attempt: hasWrong,
            });
        }

        return sidebar_problems;
    }

    protected get_language_name(lang: string): string {
        switch (lang) {
            case "c": return "C";
            case "cpp": return "C++";
            case "py": return "Python";
            default: return "";
        }
    }

    protected get_navbar(tab: number, username: string | undefined) {
        return {
            selected_tab: tab,
            username: username
        }
    }
}