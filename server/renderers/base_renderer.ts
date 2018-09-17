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

        let all_problems = this.scoring_system.getProblems();
        for (let prob of all_problems) {
            let hasCompleted = false;
            let hasWrong = false;

            for await (let j of this.job_tracker.get_jobs_by_username(username)) {
                if (j.problem != prob.dir_name) continue;

                if (j.status.kind == "COMPLETED") {
                    hasCompleted = true;
                    break;
                } else {
                    hasWrong = true;
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