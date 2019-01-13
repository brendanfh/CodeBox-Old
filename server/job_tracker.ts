import * as shared_types from "../shared/types";
import fs from "fs";
import path from "path";
import { runInThisContext } from "vm";
import { JobModel } from "./models/job_model";
import { Database } from "./database";
import { IInjectable, Kernel } from "../shared/injection/injection";

export type UsersJobs = Map<string, Map<string, shared_types.Job[]>>;
export type JobIDMap = Map<string, [string, string]>;

export default class JobTracker implements IInjectable {
    private static JOB_FOLDER_LOCATION: string = "/jobs";

    private jobs: UsersJobs;
    private job_ids: JobIDMap;
    private job_model: JobModel;

    public constructor(kernel: Kernel) {
        this.jobs = new Map();
        this.job_ids = new Map();

        this.job_model = kernel.get<JobModel>("JobModel");
    }

    public async add_job(id: shared_types.JobID, time_started: number, username: string, sub: shared_types.IPCJobSubmission) {
        await this.job_model.create({
            id,
            username,
            status: { kind: "STARTED" },
            status_str: "STARTED",
            problem: sub.problem,
            lang: sub.lang,
            code: sub.code,
            time_initiated: time_started
        });
    }

    public async update_job(id: string, status: shared_types.JobStatus) {
        await this.job_model.update(id, {
            status: status,
            status_str: status.kind
        })
    }

    public async get_job(id: shared_types.JobID): Promise<shared_types.Job | null> {
        return await this.job_model.findById(id);
    }

    public async *get_jobs_by_username(username: string): AsyncIterableIterator<shared_types.Job> {
        yield* (await this.job_model.findByUsername(username));
    }

    public async *get_jobs_by_problem(problem: string): AsyncIterableIterator<shared_types.Job> {
        yield* (await this.job_model.findByProblem(problem));
    }

    public async *get_jobs_by_username_and_problem(username: string, problem: string): AsyncIterableIterator<shared_types.Job> {
        yield* (await this.job_model.findByUsernameAndProblem(username, problem));
    }

    public async *get_jobs_by_problem_and_status(problem: string, status: shared_types.JobStatusStrs): AsyncIterableIterator<shared_types.Job> {
        yield* (await this.job_model.findByProblemAndStatus(problem, status));
    }

    public async *get_jobs_by_all(username: string, problem: string, status: shared_types.JobStatusStrs): AsyncIterableIterator<shared_types.Job> {
        yield* (await this.job_model.findByAll(username, problem, [status]));
    }

    public async *get_solved_problems_by_username(username: string): AsyncIterableIterator<shared_types.Job> {
        yield* (await this.job_model.findByUsernameAndStatus(username, "COMPLETED"));
    }

    public async *get_failed_problems_by_username(username: string): AsyncIterableIterator<shared_types.Job> {
        yield* (await this.job_model.findByUsernameAndStatuses(
            username,
            ["WRONG_ANSWER", "TIME_LIMIT_EXCEEDED", "BAD_EXECUTION", "COMPILE_ERR"]
        ));
    }

    public async *get_solved_problems_by_username_and_problem(username: string, problem: string): AsyncIterableIterator<shared_types.Job> {
        yield* (await this.job_model.findByAll(username, problem, ["COMPLETED"], { order: [['time_initiated', "ASC"]] }));
    }

    public async *get_failed_problems_by_username_and_problem(username: string, problem: string): AsyncIterableIterator<shared_types.Job> {
        yield* (await this.job_model.findByAll(
            username, problem,
            ["WRONG_ANSWER", "TIME_LIMIT_EXCEEDED", "BAD_EXECUTION", "COMPILE_ERR"]
        ));
    }
}