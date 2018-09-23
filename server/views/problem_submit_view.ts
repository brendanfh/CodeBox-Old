import express from "express";

import { BaseView } from "./base_view";

export class ProblemSubmitView extends BaseView {
    public static RENDERER_NAME: string = "ProblemSubmitRenderer";

    public async render(res: express.Response, problem_name: string, username: string, default_lang: string = "c"): Promise<void> {
        let problem = this.scoring_system.get_problem_by_dir_name(problem_name);

        if (problem == undefined) {
            res.render("problem/description", {
                navbar: { selected_tab: 1 },
                problem_description: `<span>Problem "${problem_name}" not found.</span>`
            })
            return;
        }

        let sidebar_problems = await this.get_sidebar_problems(username);

        res.render("problem/submit", {
            navbar: this.get_navbar(this.navbar_tabs.submissions, username),
            problem: {
                dir_name: problem.dir_name,
                name: problem.name,
            },
            default_lang,
            sidebar_problems,
            sidebar_href(dir_name: string) {
                return `/problems/${dir_name}/`
            }
        });
    }
}