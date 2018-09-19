import { ProblemModel, ProblemModel_T } from "./models/problem_model";
import path from "path";
import fs from "fs";
import { Database } from "./database";
import JobTracker from "./job_tracker";

import * as shared_types from "../shared/types";


export default class ScoringSystem {
    private problems: Map<string, ProblemModel_T>;
    private database: Database;

    private start_time: Date;
    private end_time: Date;

    constructor(database: Database) {
        this.problems = new Map<string, ProblemModel_T>();
        this.database = database;

        this.start_time = new Date(0);
        this.end_time = new Date(0);
    }

    public async load_problem(letter: string, dir_name: string) {
        if (process.env.ROOT_DIR == undefined) {
            throw new Error("ROOT_DIR IS NOT SET");
        }

        let problem_dir = path.join(process.env.ROOT_DIR, "/problems");

        let problem_model = await this.database.getModel(ProblemModel).findOrCreate(
            dir_name,
            {
                dir_name,
                name: "",
                description: "",
                time_limit: 0,
                attempts: 0,
                correct_attempts: 0,
                timed_out_attempts: 0,
                wrong_answer_attempts: 0,
                other_bad_attempts: 0
            }
        );

        if (problem_model == null) return;

        //We load the data about the problem that should be be entirely independent of the database (i.e. desciption)
        let problem_files = fs.readdirSync(path.join(problem_dir, dir_name));

        let info_file = problem_files
            .filter(p => /problem\.json/g.exec(p))[0];

        let info_contents = fs.readFileSync(path.resolve(problem_dir, dir_name, info_file), { encoding: "utf8" });
        let time_limit: number = 0.0;
        let name: string = "";

        try {
            let problem_info = JSON.parse(info_contents);

            if (problem_info.time_limit && problem_info.name) {
                time_limit = parseInt(problem_info.time_limit);
                name = problem_info.name;
            } else {
                throw new Error();
            }
        } catch (err) {
            throw new Error("Failed parsing time limit or name for problem: " + dir_name);
        }

        let description_file = problem_files
            .filter(p => /[a-zA-Z0-9]+\.md/g.exec(p) != null)[0];

        let description = fs.readFileSync(path.join(problem_dir, dir_name, description_file), { encoding: "utf8" });

        let p = problem_model.get();
        p.description = description;
        p.name = name;
        p.time_limit = time_limit;
        this.database.getModel(ProblemModel).update(p);

        this.problems.set(letter, p);
    }

    public async save_problems(): Promise<void> {
        let prob_model: ProblemModel = this.database.getModel(ProblemModel);

        for (let prob of this.problems.values())
            prob_model.update(prob);
    }

    public set_start_time(time: string) {
        this.start_time = new Date(time);
    }

    public set_end_time(time: string) {
        this.end_time = new Date(time);
    }

    public get_problem_by_dir_name(name: string): ProblemModel_T | undefined {
        for (let prob of this.problems.values()) {
            if (prob.dir_name == name) {
                return prob;
            }
        }

        return undefined;
    }

    public get_problem_by_letter(letter: string): ProblemModel_T | undefined {
        return this.problems.get(letter);
    }

    public get_problems(): Array<ProblemModel_T & { letter: string }> {
        let probs = [];
        for (let [letter, prob] of this.problems.entries()) {
            probs.push({
                ...prob,
                letter: letter
            });
        }

        probs.sort((a, b) => {
            if (a.letter < b.letter) {
                return -1;
            } else if (a.letter > b.letter) {
                return 1;
            } else {
                return 0;
            }
        });

        return probs;
    }

    public async update_problem_stats(job_id: shared_types.JobID, job_tracker: JobTracker) {
        let job = await job_tracker.get_job(job_id);
        if (job == null) return;

        let problem = this.get_problem_by_dir_name(job.problem);
        if (problem == null) return;

        switch (job.status.kind) {
            case "COMPLETED":
                problem.correct_attempts++;
                problem.attempts++;
                break;

            case "WRONG_ANSWER":
                problem.wrong_answer_attempts++;
                problem.attempts++;
                break;

            case "TIME_LIMIT_EXCEEDED":
                problem.timed_out_attempts++;
                problem.attempts++;
                break;

            case "COMPILE_ERR":
            case "BAD_EXECUTION":
                problem.other_bad_attempts++;
                problem.attempts++;
        }


        this.database.getModel(ProblemModel).update(problem);
    }
}