
import express from "express";
import { BaseView } from "./base_view";

export class ForgotPasswordView extends BaseView {
	public static RENDERER_NAME: string = "ForgotPasswordView";
	
    public async render(res: express.Response, csrfToken: string): Promise<void> {
    	res.render("account/forgot_password", {
    		navbar: this.get_navbar(-1, undefined),
			csrfToken,
    	})
    }
}
