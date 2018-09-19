import express from "express";

import { BaseRenderer } from "./base_renderer";

export class ProblemSubmitRenderer extends BaseRenderer {
    public static RENDERER_NAME: string = "ProblemSubmitRenderer";

    public async render(res: express.Response, problem_name: string, username: string): Promise<void> {
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
            navbar: this.get_navbar(this.navbar_tabs.problems, username),
            problem: {
                dir_name: problem.dir_name,
                name: problem.name,
            },
            sidebar_problems,
            sidebar_href(dir_name: string) {
                return `/problems/${dir_name}/`
            }
        });
    }
}