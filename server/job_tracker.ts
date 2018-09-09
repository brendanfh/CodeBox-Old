import * as shared_types from "../shared/types";

export default class JobTracker {
    private jobs: Map<shared_types.JobID, shared_types.Job>;

    public constructor() {
        this.jobs = new Map<shared_types.JobID, shared_types.Job>();
    }

    public add_job(id: shared_types.JobID, sub: shared_types.Submission) {
        this.jobs.set(id, {
            id: id,
            submission: sub,
            status: { kind: "STARTED" }
        });
    }

    public update_job(id: shared_types.JobID, status: shared_types.JobStatus) {
        let job = this.jobs.get(id);
        if (job == null) return;

        if (job.id != id) return;

        job.status = status;
        this.jobs.set(id, job);
    }

    public get_job(id: shared_types.JobID): shared_types.Job | undefined {
        return this.jobs.get(id);
    }

    public save_to_file(file_path: string) {
        // TODO: Save Jobs to a file
    }
}