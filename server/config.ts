import path from "path";
import fs from "fs";
import ScoringSystem from "./scoring_system";
import JobTracker from "./job_tracker";
import WebServer from "./web_server";

export let GLOBAL_CONFIG = {
    HOSTING_NAME: "ORGANIZATION NAME HERE",

    PORT: 0,
    SSL_PORT: 0,
    SSL_CERTIFICATE_PATH: "",
    SSL_KEY_PATH: "",

    FORGOT_PASSWORD_EMAIL: "",
    FORGOT_PASSWORD_EMAIL_PASSWORD: "",

	EMAIL_VERIFY_REGEX: /.*/g,

	DOMAIN_NAME: "",
}

export async function loadConfig(scoring: ScoringSystem, web_server: WebServer) {
    if (process.env.ROOT_DIR == null) {
        throw new Error("ROOT_DIR not set");
    }

    let config_file_path = path.join(process.env.ROOT_DIR, "config.json");
    let config_contents = fs.readFileSync(config_file_path, { encoding: "utf8" });
    if (config_contents == null) {
        throw new Error("Reading config.json failed");
    }

    let config = JSON.parse(config_contents);

    scoring.set_start_time(config.start_time);
    scoring.set_end_time(config.end_time);

    for (let letter in config.problems) {
        let problem_dir = config.problems[letter];

        await scoring.load_problem(letter, problem_dir);
    }

    GLOBAL_CONFIG.HOSTING_NAME = config.hosting_name;
    GLOBAL_CONFIG.PORT = config.port || 8000;
    GLOBAL_CONFIG.SSL_PORT = config.ssl_port || 8443;
    GLOBAL_CONFIG.SSL_CERTIFICATE_PATH = config.ssl_cert || "";
    GLOBAL_CONFIG.SSL_KEY_PATH = config.ssl_key || "";
    GLOBAL_CONFIG.FORGOT_PASSWORD_EMAIL = config.forgot_password_email || "";
    GLOBAL_CONFIG.FORGOT_PASSWORD_EMAIL_PASSWORD = config.forgot_password_email_password || "";
	GLOBAL_CONFIG.EMAIL_VERIFY_REGEX = new RegExp(config.email_verify_regex);
	GLOBAL_CONFIG.DOMAIN_NAME = config.domain_name || "";

    web_server.update_emailer();
}
