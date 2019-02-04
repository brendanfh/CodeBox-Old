import { ProblemModel, ProblemModel_T } from "./models/problem_model";
import path from "path";
import fs from "fs";
import { Database } from "./database";
import JobTracker from "./job_tracker";
import { JobModel } from "./models/job_model";

import * as shared_types from "../shared/types";
import { IInjectable, Kernel } from "../shared/injection/injection";
import { ProblemKind } from "../shared/types";

type LeaderboardProblemStatus
    = "NOT_ATTEMPTED"
    | "WRONG"
    | "CORRECT";
//                            Status,                   worth,  shown
type LPSMap = { [k: string]: [LeaderboardProblemStatus, number, boolean] };

export default class ScoringSystem implements IInjectable {
    //letter to problem
    private problems: Map<string, ProblemModel_T>;
    private database: Database;
    private job_tracker: JobTracker;

    //username to score, problem map
    private user_scores: Map<string, [number, LPSMap]>;
    private code_golf_scores: Map<string, number>;
    private code_golf_leaders: Array<string>;

    private start_time: Date;
    private end_time: Date;

    constructor(kernel: Kernel) {
        this.problems = new Map<string, ProblemModel_T>();
        this.database = kernel.get<Database>("Database");
        this.job_tracker = kernel.get<JobTracker>("JobTracker");

        this.user_scores = new Map();
        this.code_golf_scores = new Map<string, number>();
        this.code_golf_leaders = new Array<string>();

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
                kind: "program",
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

        //We load the data about the problem that should be be entirely independent of the database (i.e. description)
        let problem_files = fs.readdirSync(path.join(problem_dir, dir_name));

        let info_file = problem_files
            .filter(p => /problem\.json/g.exec(p))[0];

        let info_contents = fs.readFileSync(path.resolve(problem_dir, dir_name, info_file), { encoding: "utf8" });
        let time_limit: number = 0.0;
        let name: string = "";
        let kind: ProblemKind = "program";

        try {
            let problem_info = JSON.parse(info_contents);

            if (problem_info.time_limit != null && problem_info.name != null && problem_info.kind != null) {
                time_limit = parseInt(problem_info.time_limit);
                name = problem_info.name;
                kind = problem_info.kind;
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
        p.kind = kind;
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

    public get_start_time(): number {
        return this.start_time.getTime();
    }

    public get_end_time(): number {
        return this.end_time.getTime();
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

    public async update_problem_stats(job_id: shared_types.JobID) {
        let job = await this.job_tracker.get_job(job_id);
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

        if (await this.database.getModel(ProblemModel).update(problem))
            console.log("UPDATED PROBLEM STATS");
    }

    public get current_scores() {
        let copy = new Map<string, [number, LPSMap]>();
        for (let u of this.user_scores.entries()) {
            copy.set(u[0], [u[1][0], u[1][1]]);
        }
        for (let u of copy.entries()) {
            u[1][0] += this.get_codegolf_score(u[0]);
        }
        return copy;
    }

    public async score_all_users(usernames: string[]): Promise<void> {
        for (let user of usernames) {
            await this.score_user(user);
        }
    }

    public async score_user(username: string): Promise<void> {
        let score: number = 0;
        let statuses: LPSMap = {};

        for (let [letter, prob] of this.problems.entries()) {
             let res = await this.score_problem(letter, prob, username);
             statuses[letter] = [res[1], res[2], prob.kind != "word"];
             score += res[0];
        }
        
        this.user_scores.set(username, [score, statuses]);

        this.sort_users_by_score();
    }

    private async score_problem(letter: string, problem: ProblemModel_T, username: string):
        Promise<[number, LeaderboardProblemStatus, number]> {

        let status: LeaderboardProblemStatus = "NOT_ATTEMPTED";

        // Number of attempts / length of code for codegolf
        let ret_val: number = 0;
        for await (let _ of this.job_tracker.get_failed_problems_by_username_and_problem(username, problem.dir_name)) {
            status = "WRONG";
            ret_val++;
        }

        let worth = 0;
        let deduction = 0;
        let isCodegolf = false;
        for await (let j of this.job_tracker.get_solved_problems_by_username_and_problem(username, problem.dir_name)) {
            if (problem.kind == "program") {
                worth = 1000;
                deduction = 10;
            } else if (problem.kind == "word") {
                worth = 500;
                deduction = 5;
            } else if (problem.kind == "codegolf") {
                worth = 250;
                deduction = 0;
                
                if (!isCodegolf) {
                    ret_val = 100000000;
                }

                isCodegolf = true;
                let bytes = JobModel.getByteCount(j);
                this.update_codegolf(username, bytes);

                if (bytes <= ret_val + 1)
                    ret_val = bytes - 1; //Because we add one later and this is easier
            }

            let time = Math.floor((j.time_initiated - this.start_time.getTime()) / 360000);
            worth -= deduction * time;
            worth -= ret_val * deduction * 2;

            status = "CORRECT";
            ret_val += 1;

            if (problem.kind != "codegolf") //Keep looking for a shorter solution
                break;
        }

        if (!isCodegolf) {
            ret_val = worth;
        }

        return [worth, status, ret_val];
    }

    private update_codegolf(username: string, bytes: number) {
        let curr_score = this.code_golf_scores.get(username);
        if (curr_score == null) curr_score = 10000000;

        if (bytes <= curr_score) {
            this.code_golf_scores.set(username, bytes);
            console.log("SCORE OF " + bytes + " FOR " + username);

            let tmp = [];
            for (let c of this.code_golf_scores) {
                 tmp.push(c);
            }

            tmp.sort((a, b) => a[1] - b[1]);
            this.code_golf_scores = new Map(tmp);

            tmp = [];
            for (let c of this.code_golf_scores.keys()) {
                console.log("PUSHING");
                tmp.push(c);
            }

            this.code_golf_leaders = tmp;
            console.log("CODE GOLF LEADERS: " + this.code_golf_leaders);
        }
    }

    private get_codegolf_score(username: string): number {
        const leaders = this.code_golf_leaders;
        if (leaders[0] == username) return 1000;
        if (leaders[1] == username) return 750;
        if (leaders[2] == username) return 500;
        if (leaders[3] == username) return 250;
        return 0;
    }

    private sort_users_by_score(): void {
        let user_scores_gen = this.user_scores.entries();
        let user_scores = [];

        for (let us of user_scores_gen) {
            user_scores.push(us);
        }    

        user_scores.sort((u1, u2) => (this.get_codegolf_score(u2[0]) + u2[1][0]) - (this.get_codegolf_score(u1[0]) + u1[1][0]));
        console.log(user_scores);

        this.user_scores = new Map(user_scores);
    }

    private calculate_score(num_completed: number, num_wrong: number, times: number[]): number {
        if (num_completed == 0 && num_wrong == 0) return 0;

        let time_diffs_sum =
            times
                .map(t => t - this.start_time.getTime())
                .reduce((a, b) => a + b, 0);

        let duration = this.end_time.getTime() - this.start_time.getTime();
        let num_problems = this.problems.size;

        return 20000 * num_problems * duration * (num_completed + 1) - time_diffs_sum - 900000 * num_wrong;
    }
}
