import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import { GLOBAL_CONFIG } from "./config"
import { Kernel, IInjectable } from "../shared/injection/injection";

export class Emailer implements IInjectable {

	private transporter: Mail | null = null;
	private email: string;

	public constructor(kernel: Kernel) {
		this.email = "";
	}

	public setEmail(email: string) {
		this.email = email;
	}

	public authenticate(password: string): void {
		this.transporter = nodemailer.createTransport({
			service: "Gmail",
			auth: {
				user: this.email,
				pass: password
			}
		})
	}

	public async sendEmail(to: string, subject: string, html_body: string): Promise<boolean> {
		const mailOptions = {
			from: GLOBAL_CONFIG.HOSTING_NAME,
			to: to,
			subject: subject,
			html: html_body
		};

		let res = await new Promise<boolean>((res, rej) => {
			if (!this.transporter) {
				rej("Transporter not initialized");
				return;
			}

			this.transporter.sendMail(mailOptions, (err, info) => {
				if (err) {
					rej("Sending email failed");
				} else {
					res(true);
				}
			});
		});

		return res;
	}
}