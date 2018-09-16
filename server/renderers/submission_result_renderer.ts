import express from "express";
import { BaseRenderer } from "./base_renderer";

export class SubmissionResultRenderer extends BaseRenderer {
    public static RENDERER_NAME: string = "SubmissionResultRenderer";

    public async render(res: express.Response, job_id: string | null, username: string): Promise<void> {
        if (job_id == null) {
            res.write("No id supplied");
            res.end();
            return;
        }

        let sidebar_problems = await this.get_sidebar_problems(username);

        let job = this.job_tracker.get_job(job_id);
        if (job == undefined) {
            res.write("No submission with id'" + job_id + "' found.");
            res.end();
            return;
        }

        if (job.username != username) {
            res.write(`The job with id '${job_id}' does not belong to '${username}'`);
            res.end();
            return;
        }

        let problem = this.scoring_system.getProblem(job.problem);
        if (problem == null) return;

        let language_name = this.get_language_name(job.lang);

        res.render("submissions/submission_result", {
            navbar: { selected_tab: 2 },
            problem: {
                dir_name: problem.dir_name,
                name: problem.name,
            },
            sidebar_problems,
            sidebar_href(dir_name: string) {
                return `/problems/${dir_name}/`
            },
            job,
            language_name
        });
    }

}