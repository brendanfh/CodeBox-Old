import express from "express";
import { BaseView } from "./base_view";

export class SubmissionResultView extends BaseView {
    public static RENDERER_NAME: string = "SubmissionResultRenderer";

    public async render(res: express.Response, job_id: string | null, username: string): Promise<void> {
        if (job_id == null) {
            res.write("No id supplied");
            res.end();
            return;
        }

        let sidebar_problems = await this.get_sidebar_problems(username);

        let job = await this.job_tracker.get_job(job_id);
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

        let problem = this.scoring_system.get_problem_by_dir_name(job.problem);

        let language_name = this.get_language_name(job.lang);

        res.render("submissions/submission_result", {
            navbar: this.get_navbar(this.navbar_tabs.submissions, username),
            problem: {
                dir_name: problem ? problem.dir_name : "",
                name: problem ? problem.name : "From previous competition",
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