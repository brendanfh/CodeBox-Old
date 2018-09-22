import express, { urlencoded } from "express";
import { BaseView } from "./base_view";
import { UserModel } from "../models/user_model";

export class HelpView extends BaseView {
    public static RENDERER_NAME: string = "HelpView";

    public async render(res: express.Response, username: string): Promise<void> {

        res.render("help", {
            navbar: this.get_navbar(this.navbar_tabs.help, username)
        });
    }
}