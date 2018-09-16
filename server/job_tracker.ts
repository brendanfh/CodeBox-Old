import * as shared_types from "../shared/types";
import fs from "fs";
import path from "path";
import { runInThisContext } from "vm";

export type UsersJobs = Map<string, Map<string, shared_types.Job[]>>;
export type JobIDMap = Map<string, [string, string]>;

export default class JobTracker {
    //TODO: store jobs in jobs folder with each user name being a different file to easily get jobs for a given user


    private static JOB_FOLDER_LOCATION: string = "/jobs";

    private jobs: UsersJobs;
    private job_ids: JobIDMap;

    public constructor() {
        this.jobs = new Map();
        this.job_ids = new Map();

        this.load_all_from_file();
    }

    public add_job(id: shared_types.JobID, time_started: number, username: string, sub: shared_types.IPCJobSubmission) {
        let user_jobs = this.jobs.get(username);
        if (user_jobs == null) {
            let new_map = new Map();
            this.jobs.set(username, new_map);
            user_jobs = new_map;
        }

        let problem_jobs = user_jobs.get(sub.problem);
        if (problem_jobs == null) {
            let new_arr = new Array();
            user_jobs.set(sub.problem, new_arr);
            problem_jobs = new_arr;
        }

        problem_jobs.push({
            id: id,
            username: username,
            status: { kind: "STARTED" },
            problem: sub.problem,
            lang: sub.lang,
            code: sub.code,
            time_initiated: time_started
        });

        this.job_ids.set(id, [username, sub.problem]);

        this.save_user_to_file(username);
    }

    public update_job(username: string, problem: string, id: string, status: shared_types.JobStatus) {
        let user_jobs = this.jobs.get(username);
        if (user_jobs == null) return;

        let problem_jobs = user_jobs.get(problem);
        if (problem_jobs == null) return;

        let job = problem_jobs.find(j => j.id == id);
        if (job == null) return;

        job.status = status;

        this.save_user_to_file(username);
    }

    public update_job_by_id(id: string, status: shared_types.JobStatus) {
        let user_and_prob = this.job_ids.get(id);
        if (user_and_prob == null) return;

        this.update_job(user_and_prob[0], user_and_prob[1], id, status);
    }

    public get_job(id: shared_types.JobID): shared_types.Job | undefined {
        let user_and_prob = this.job_ids.get(id);
        if (user_and_prob == null) return;

        let user_jobs = this.jobs.get(user_and_prob[0]);
        if (user_jobs == null) return;

        let problem_jobs = user_jobs.get(user_and_prob[1]);
        if (problem_jobs == null) return;

        let job = problem_jobs.find(j => j.id == id);
        if (job == null) return;

        return job;
    }

    public *get_jobs_by_username(username: string): IterableIterator<shared_types.Job> {
        let user_jobs = this.jobs.get(username);
        if (user_jobs == null) return;

        for (let prob of user_jobs.values()) {
            yield* prob;
        }
    }

    public *get_jobs_by_problem(problem: string): IterableIterator<shared_types.Job> {
        for (let users of this.jobs.values()) {
            let prob = users.get(problem);
            if (prob == null) continue;

            yield* prob;
        }
    }

    public *get_jobs_by_username_and_problem(username: string, problem: string): IterableIterator<shared_types.Job> {
        let user_jobs = this.jobs.get(username);
        if (user_jobs == null) return;

        let problem_jobs = user_jobs.get(problem);
        if (problem_jobs == null) return;

        yield* problem_jobs;
    }

    private async load_all_from_file() {
        if (process.env.ROOT_DIR == undefined) {
            throw new Error("ROOT_DIR NOT SET");
        }

        let job_dir = path.join(process.env.ROOT_DIR, JobTracker.JOB_FOLDER_LOCATION);

        let users = fs.readdirSync(job_dir).map(u => {
            let uReg = /(.+)\.dat/g.exec(u);
            if (uReg == null) return null;

            return uReg[1];
        });

        for (let user of users) {
            if (user == null) continue;
            fs.readFile(path.join(job_dir, `${user}.dat`), { encoding: 'utf8' }, (err, data) => {
                if (err) {
                    console.log(`[WARNING] Failed to load jobs for user: ${user}`);
                    return;
                }
                if (user == null) return;

                let job_obj = JSON.parse(data);

                for (let job of job_obj) {
                    let user_jobs = this.jobs.get(user);
                    if (user_jobs == null) {
                        let new_map = new Map();
                        this.jobs.set(user, new_map);
                        user_jobs = new_map;
                    }

                    let problem_jobs = user_jobs.get(job.problem);
                    if (problem_jobs == null) {
                        let new_arr = new Array();
                        user_jobs.set(job.problem, new_arr);
                        problem_jobs = new_arr;
                    }

                    problem_jobs.push({
                        id: job.id,
                        username: user,
                        status: job.status,
                        problem: job.problem,
                        lang: job.lang,
                        code: job.code,
                        time_initiated: job.time_initiated
                    });

                    this.job_ids.set(job.id, [user, job.problem]);
                }
            });
        }
    }

    private async save_user_to_file(username: string): Promise<void> {
        let jobs = this.get_jobs_by_username(username);

        let all_jobs = [];
        for (let j of jobs) {
            all_jobs.push(j);
        }

        let str = JSON.stringify(all_jobs);

        await new Promise((res, rej) => {
            if (process.env.ROOT_DIR == null) {
                rej("ROOT_DIR NOT SET");
                return;
            }

            fs.writeFile(path.join(process.env.ROOT_DIR, JobTracker.JOB_FOLDER_LOCATION, `${username}.dat`), str, { encoding: 'utf8' }, (err) => {
                if (err) {
                    console.log("[WARNING] Failed to write user file");
                }
                res();
            });
        });
    }

    private async save_all_to_file() {
        for (let user of this.jobs.keys()) {
            await this.save_user_to_file(user);
        }
    }
}