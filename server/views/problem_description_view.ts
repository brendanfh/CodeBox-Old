import express from "express";
import showdown from "showdown";

import { BaseView } from "./base_view";

export class ProblemDescriptionView extends BaseView {
    public static RENDERER_NAME: string = "ProblemDescriptionRenderer";

    public async render(res: express.Response, problem_name: string, username: string): Promise<void> {
        let problem = this.scoring_system.get_problem_by_dir_name(problem_name);

        if (problem == undefined) {
            res.render("problem/description", {
                navbar: { selected_tab: 1 },
                problem_description: `<span>Problem "${problem_name}" not found.</span>`
            });
            return;
        }

        let showdown_conv = new showdown.Converter();
        let desc_html = showdown_conv.makeHtml(problem.description);

        let sidebar_problems = await this.get_sidebar_problems(username);

        let has_submissions: boolean = false;
        for await (let j of this.job_tracker.get_jobs_by_username_and_problem(username, problem_name)) {
            has_submissions = true;
            break;
        }

        res.render("problem/description", {
            navbar: this.get_navbar(this.navbar_tabs.problems, username),
            problem: {
                description: desc_html,
                dir_name: problem.dir_name,
                kind: problem.kind,
                name: problem.name,
                wrong_answer_attempts: problem.wrong_answer_attempts,
                other_bad_attempts: problem.other_bad_attempts,
                timed_out_attempts: problem.timed_out_attempts,
                correct_attempts: problem.correct_attempts,
                attempts: problem.attempts,
                time_limit: (problem.time_limit / 1000).toString() + " seconds",
                has_submissions
            },
            sidebar_problems,
            sidebar_href(dir_name: string) {
                return `/problems/${dir_name}/`
            }
        });
    }
}