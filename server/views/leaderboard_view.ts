import express, { urlencoded } from "express";
import { BaseView } from "./base_view";
import { UserModel } from "../models/user_model";

export class LeaderboardView extends BaseView {
    public static RENDERER_NAME: string = "LeaderboardView";

    public async render(res: express.Response, username: string): Promise<void> {

        let user = await this.database.getModel(UserModel).findByUsername(username);
        let nickname = "";
        if (user) {
            nickname = user.getDataValue("nickname");
        }

        res.render("leaderboard", {
            navbar: this.get_navbar(0, username),
            nickname
        });
    }
}