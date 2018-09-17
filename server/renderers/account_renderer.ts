import express from "express";
import { BaseRenderer } from "./base_renderer";
import { UserModel } from "../models/user_model";

export class AccountRenderer extends BaseRenderer {
    public static RENDERER_NAME: string = "AccountRenderer";

    public async render(res: express.Response, username: string, status: string): Promise<void> {
        let user = await this.database.getModel(UserModel).findByUsername(username);
        if (user == null) return;

        let user_m = user.get();

        res.render("account", {
            navbar: this.get_navbar(-1, username),
            status: status,
            user: {
                username: user_m.username,
                email: user_m.email,
                nickname: user_m.nickname
            }
        });
    }
}