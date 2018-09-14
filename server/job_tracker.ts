import * as shared_types from "../shared/types";
import fs from "fs";
import path from "path";

export default class JobTracker {
    //TODO: store jobs in jobs folder with each user name being a different file to easily get jobs for a given user


    private static JOB_FILE_LOCATION: string = "/job_backup.dat";

    private jobs: Map<shared_types.JobID, shared_types.Job>;
    private last_save_time: number = 0;

    public constructor() {
        this.jobs = new Map<shared_types.JobID, shared_types.Job>();

        this.load_from_file();
    }

    public add_job(id: shared_types.JobID, username: string, sub: shared_types.IPCJobSubmission) {
        this.jobs.set(id, {
            id: id,
            username: username,
            status: { kind: "STARTED" },
            problem: sub.problem,
            lang: sub.lang,
            code: sub.code
        });

        this.check_for_save();
    }

    public update_job(id: shared_types.JobID, status: shared_types.JobStatus) {
        let job = this.jobs.get(id);
        if (job == null) return;

        if (job.id != id) return;

        job.status = status;
        this.jobs.set(id, job);

        if (status.kind != "RUNNING" && status.kind != "COMPILING" && status.kind != "STARTED") {
            // Force save if the problem hit an end state
            this.last_save_time = 0;
        }

        this.check_for_save();
    }

    public get_jobs(): Map<shared_types.JobID, shared_types.Job> {
        return this.jobs;
    }

    public get_job(id: shared_types.JobID): shared_types.Job | undefined {
        return this.jobs.get(id);
    }

    public async *get_jobs_by_username(username: string): AsyncIterableIterator<shared_types.Job> {
        for (let job of this.jobs.values()) {
            if (job.username == username)
                yield job;
        }
    }

    public async *get_jobs_by_problem(problem: string): AsyncIterableIterator<shared_types.Job> {
        for (let job of this.jobs.values()) {
            if (job.problem == problem)
                yield job;
        }
    }

    public async *get_jobs_by_username_and_problem(username: string, problem: string): AsyncIterableIterator<shared_types.Job> {
        for (let job of this.jobs.values()) {
            if (job.username == username && job.problem == problem)
                yield job;
        }
    }

    private check_for_save() {
        if (this.last_save_time + 60 * 1000 < Date.now()) {
            this.save_to_file();
            this.last_save_time = Date.now();
        }
    }

    private async load_from_file() {
        if (process.env.ROOT_DIR == undefined) {
            throw new Error("ROOT_DIR NOT SET");
        }

        fs.readFile(path.join(process.env.ROOT_DIR, JobTracker.JOB_FILE_LOCATION), { encoding: 'utf8' }, (err, data) => {
            if (err) {
                console.log("[WARNING] Failed to load job backup file")
                return;
            }

            let job_obj = JSON.parse(data);
            for (let j of job_obj) {
                this.jobs.set(j.id, {
                    id: j.id,
                    username: j.username,
                    status: j.status,
                    problem: j.problem,
                    lang: j.lang,
                    code: ""
                });
            }
        });
    }

    private async save_to_file() {
        let all_jobs = [];
        for (let job of this.jobs.values()) {
            all_jobs.push(job);
        }

        all_jobs.forEach(j => delete j.code);

        let str = JSON.stringify(all_jobs);
        return new Promise((res, rej) => {
            if (process.env.ROOT_DIR == undefined) {
                throw new Error("ROOT_DIR NOT SET");
            }

            fs.writeFile(path.join(process.env.ROOT_DIR, JobTracker.JOB_FILE_LOCATION), str, { encoding: 'utf8' }, (err) => {
                if (err) {
                    console.log("[WARNING] Failed to write job backup file")
                }
                res();
            });
        });
    }
}