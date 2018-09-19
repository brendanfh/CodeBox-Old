import express from "express";
import { BaseView } from "./base_view";

export class LeaderboardView extends BaseView {
    public static RENDERER_NAME: string = "LeaderboardView";

    public async render(res: express.Response, username: string): Promise<void> {

        res.render("leaderboard", {
            navbar: this.get_navbar(0, username)
        });
    }
}