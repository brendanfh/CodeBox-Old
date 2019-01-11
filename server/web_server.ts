import path from "path";
import fs from "fs";

import express from "express";
import http from "http";
import https from "https";
import body_parser from "body-parser";
import csurf from "csurf";
import IPCServer from "./ipc_server";
import JobTracker from "./job_tracker";
import { Database } from "./database";

import morgan from "morgan";
import cookieParser from "cookie-parser";
import session from "express-session";
import fileUpload from "express-fileupload";
import querystring from "querystring";

import * as shared_types from "../shared/types";
import { UserModel } from "./models/user_model";
import ScoringSystem from "./scoring_system";
import { BaseView } from "./views/base_view";
import { ProblemDescriptionView } from "./views/problem_description_view";
import { SubmissionListView } from "./views/submission_list_view";
import { ProblemListView } from "./views/problem_list_view";
import { SubmissionResultView } from "./views/submission_result_view";
import { ProblemSubmitView } from "./views/problem_submit_view";
import { AccountView } from "./views/account_view";
import { LeaderboardView } from "./views/leaderboard_view";
import { GLOBAL_CONFIG } from "./config";
import { HelpView } from "./views/help_view";
import { ForgotPasswordView } from "./views/forgot_password_view";
import { Emailer } from "./emailer";
import { IInjectable, Kernel } from "../shared/injection/injection";

interface IView<T extends BaseView> {
    RENDERER_NAME: string;
    new(jt: JobTracker, ss: ScoringSystem, db: Database): T
}

export default class WebServer implements IInjectable {
    private expressApp: express.Application;
    private ipc_server: IPCServer;
    private job_tracker: JobTracker;
    private database: Database;
    private scoringSystem: ScoringSystem;

    private emailer: Emailer;

    private views: Map<string, BaseView>;

    public constructor(kernel: Kernel) {
        this.expressApp = express();
        this.setupApiRoutes();
        this.setupWebRoutes();

        this.job_tracker = kernel.get<JobTracker>("JobTracker");
        this.ipc_server = kernel.get<IPCServer>("IPCServer");
        this.database = kernel.get<Database>("Database");
        this.scoringSystem = kernel.get<ScoringSystem>("ScoringSystem");
        this.emailer = kernel.get<Emailer>("Emailer");

        this.views = new Map();

        this.add_view(ProblemDescriptionView);
        this.add_view(ProblemListView);
        this.add_view(SubmissionListView);
        this.add_view(SubmissionResultView);
        this.add_view(ProblemSubmitView);
        this.add_view(AccountView);
        this.add_view(LeaderboardView);
        this.add_view(HelpView);
        this.add_view(ForgotPasswordView);
    }

    private add_view<T extends BaseView>(renderer: IView<T>) {
        let ren = new renderer(this.job_tracker, this.scoringSystem, this.database);

        this.views.set(renderer.RENDERER_NAME, ren);
    }

    private get_view<T extends BaseView>(renderer: IView<T>): T | undefined {
        return this.views.get(renderer.RENDERER_NAME) as T;
    }

    public update_emailer() {
        this.emailer.setEmail(GLOBAL_CONFIG.FORGOT_PASSWORD_EMAIL);
        this.emailer.authenticate(GLOBAL_CONFIG.FORGOT_PASSWORD_EMAIL_PASSWORD);
    }

    protected setupApiRoutes() {
        let app = this.expressApp;

        let api = express.Router();
        api.use(body_parser.json());

        api.post("/request_check", async (req, res) => {
            let problem = this.scoringSystem.get_problem_by_dir_name(req.body.problem);
            if (problem == null) return;

            let test: shared_types.IPCJobSubmission = {
                problem: req.body.problem,
                lang: req.body.lang,
                code: req.body.code,
                time_limit: problem.time_limit
            };

            try {
                let job_id = await this.ipc_server.request_test(test);

                res.status(200);
                res.json({ id: job_id });
            } catch (_) {
                res.status(500);
                res.json({ err: "Executer server not connected" });
            }
        });

        api.get("/job_status", async (req, res) => {
            let job_id = req.query.id;

            let job = this.job_tracker.get_job(job_id);

            if (job == undefined) {
                res.status(500);
                res.json({ err: "Bad id" });
            } else {
                res.status(200);
                res.json(job);
            }
        });

        app.use("/api", api);
    }

    protected setupWebRoutes() {
        let app = this.expressApp;

        app.use(morgan('dev'));
        app.use(body_parser.urlencoded({ extended: true }));
        app.use(cookieParser());
        app.use(session({
            secret: "THISSHOULDBESOMEBIGSECRETFORSECURITY",
            name: "uuid",
            resave: false,
            saveUninitialized: false,
            cookie: {
                expires: false,
            }
        }));
        app.use(fileUpload());

        //THIS WILL HAVE TO CHANGE
        app.use((req, res, next) => {
            // if (req.cookies.uuid && !(req.session ? req.session.user : true)) {
            //     res.clearcookie("uuid");
            // }

            //Tack on flash messages
            if (req.session) {
                res.locals = {
                    page_title: GLOBAL_CONFIG.HOSTING_NAME,
                    flash_message: req.session.flash
                };

                if (req.session.flash)
                    req.session.flash = null;
            }
            next();
        });

        let redirectToLeaderboard: express.Handler = (req, res, next) => {
            if (req.session == null) {
                next();
                return;
            }
            if (req.session.user && req.cookies.uuid) {
                res.redirect("/leaderboard");
            } else {
                next();
            }
        };

        let requireLogin: express.Handler = (req, res, next) => {
            if (req.session == null) {
                res.redirect("/login");
                return;
            }
            if (req.session.user == null) {
                res.redirect("/login");
                return;
            }

            next();
        };

        let afterStart: express.Handler = (req, res, next) => {
            let time = Date.now();
            if (time < this.scoringSystem.get_start_time()) {
                if (req.session) req.session.flash = "Competition has not started yet.";

                let url = req.header("Referer") || "/";
                res.redirect(url);
                return;
            }
            next();
        };

        let beforeEnd: express.Handler = (req, res, next) => {
            let time = Date.now();
            if (time > this.scoringSystem.get_end_time()) {
                if (req.session) req.session.flash = "Competition has ended.";

                let url = req.header("Referer") || "/";
                res.redirect(url);
                return;
            }
            next();
        };

        let csrfProtected = csurf();

        app.engine('ejs', require('ejs-mate'));
        app.set('views', path.resolve(process.cwd(), "web/views"));
        app.set('view engine', 'ejs');

        app.use("/static", express.static(path.resolve(process.cwd(), "web/static")));

        app.get("/", (req, res) => {
            res.redirect("/leaderboard")
        });

        account: {
            app.route("/login")
                .get(redirectToLeaderboard, csrfProtected, (req, res) => {
                    res.render("account/login", {
                        navbar: { selected_tab: -1 },
                        csrfToken: req.csrfToken(),
                    });
                })
                .post(csrfProtected, async (req, res) => {
                    let username = req.body.username,
                        password = req.body.password;

                    let validated = await this.database.getModel(UserModel).validateUser(username, password);

                    if (!validated) {
                        if (req.session) {
                            req.session.flash = "Incorrect username or password.";
                        }
                        res.redirect("/login");
                    } else {
                        if (req.session) {
                            let user = await this.database.getModel(UserModel).findByUsername(username);
                            if (user == null) return;

                            req.session.user = {
                                username: user.getDataValue("username"),
                                email: user.getDataValue("email"),
                                nickname: user.getDataValue("nickname"),
                            };
                        }
                        res.redirect("/");
                    }
                });

            app.get("/logout", (req, res) => {
                console.log(req.get('host'));
                if (req.get('host') != GLOBAL_CONFIG.DOMAIN_NAME) {
                    res.redirect('/');
                    return;
                }

                if (req.session) {
                    req.session.user = null;
                }

                res.redirect("/login");
            });

            app.route("/signup")
                .get(redirectToLeaderboard, csrfProtected, (req, res) => {
                    res.render("account/signup", {
                        navbar: { selected_tab: -1 },
                        csrfToken: req.csrfToken(),
                    });
                })
                .post(redirectToLeaderboard, csrfProtected, async (req, res) => {
                    try {
                        if (!req.body.username
                            || !req.body.password
                            || !req.body.confirm_password
                            || !req.body.email
                            || !req.body.nickname) {
                            if (req.session) req.session.flash = "All fields are required."
                            res.redirect("/signup")
                        }

                        if (req.body.password != req.body.confirm_password) {
                            if (req.session) req.session.flash = "Passwords do not match.";
                            throw new Error("Passwords do not match");
                        }

                        if (req.body.email) {
                            let works = GLOBAL_CONFIG.EMAIL_VERIFY_REGEX.test(req.body.email);
                            if (!works) {
                                if (req.session) req.session.flash = "Invalid email.";
                                throw new Error("Bad email");
                            }
                        }

                        let user = await this.database.getModel(UserModel).createWithValues(
                            req.body.username,
                            req.body.password,
                            req.body.email,
                            req.body.nickname
                        );

                        if (req.session && user != null) {
                            req.session.user = {
                                username: user.getDataValue("username"),
                                email: user.getDataValue("email"),
                                nickname: user.getDataValue("nickname"),
                            };

                            this.scoringSystem.score_user(user.getDataValue("username"));
                        }

                        res.redirect("/");
                    }
                    catch (err) {
                        console.log(err);
                        res.redirect("/signup");
                    }
                })

            app.get("/account", requireLogin, csrfProtected, (req, res) => {
                if (req.session == null) return;

                let renderer = this.get_view(AccountView);
                if (renderer == null) return;

                renderer.render(res, req.session.user.username, req.query.status, req.csrfToken());
            });

            app.post("/account/change_info", requireLogin, csrfProtected, async (req, res) => {
                if (req.session == null) return;

                if (req.body.email) {
                    let works = GLOBAL_CONFIG.EMAIL_VERIFY_REGEX.test(req.body.email);
                    if (!works) {
                        if (req.session) req.session.flash = "Invalid email.";
                        res.redirect("/account");
                    }
                }

                try {
                    let worked = await this.database.getModel(UserModel).updateInfoByUsername(
                        req.session.user.username,
                        req.body.email,
                        req.body.nickname
                    );

                    if (worked) {
                        res.redirect("/account?status=change_info_successful");
                    } else {
                        res.redirect("/account?status=change_info_failed");
                    }
                } catch (err) {
                    req.session.flash = "Something went wrong.";
                    res.redirect("/account");
                }
            });

            app.post("/account/change_password", requireLogin, csrfProtected, async (req, res) => {
                if (req.session == null) return;

                let user_model = this.database.getModel(UserModel);

                let username = req.session.user.username;
                let curr_password = req.body.current_password;
                let new_password_1 = req.body.new_password_1;
                let new_password_2 = req.body.new_password_2;

                let validated = await user_model.validateUser(username, curr_password);

                if (!validated) {
                    res.redirect("/account?status=change_password_failed");
                } else {
                    if (new_password_1 == new_password_2) {
                        user_model.updatePasswordByUsername(username, new_password_1);
                        res.redirect("/account?status=change_password_successful");
                    } else {
                        res.redirect("/account?status=change_password_failed");
                    }
                }
            });

            app.route("/forgot_password")
                .get(redirectToLeaderboard, csrfProtected, async (req, res) => {
                    let view = this.get_view(ForgotPasswordView);
                    if (view == null) return;

                    view.render(res, req.csrfToken());
                })
                .post(csrfProtected, async (req, res) => {
                    if (!req.session) {
                        res.redirect("/");
                        return;
                    }

                    if (!req.body.email) {
                        req.session.flash = "An error occured";
                        res.redirect("/forgot_password");
                        return;
                    }

                    let user_model = this.database.getModel(UserModel);

                    let user = await user_model.findByEmail(req.body.email);
                    if (user == null) {
                        req.session.flash = "Email not found.";
                        res.redirect("/forgot_password");
                        return;
                    }

                    let new_password = UserModel.generateRandomPassword(12);

                    let result = await this.emailer.sendEmail(user.getDataValue("email"), "Password reset",
                        `You have recently reset your password with ${GLOBAL_CONFIG.HOSTING_NAME}.\n
                        Your new password is <b>${new_password}</b>.\n
                        Please log in using this password and then change it in the 'My Account' section.
                        `);

                    if (result) {
                        await user_model.updatePasswordByUsername(user.getDataValue("username"), new_password);
                        console.log("New password is ", new_password);

                        req.session.flash = "Password reset email sent successfully. Please check your email.";
                        res.redirect("/login");
                    } else {
                        req.session.flash = "There was an error resetting your password. Your password has not changed."
                        res.redirect("/forgot_password");
                    }
                });
        }

        problems: {
            app.get("/problems", requireLogin, afterStart, async (req, res) => {
                if (req.session == null) return;

                let renderer = this.get_view(ProblemListView);
                if (renderer == null) return;

                renderer.render(res, req.session.user.username);
            });

            app.get("/problems/:problem_name", requireLogin, afterStart, async (req, res) => {
                if (req.session == null) return;

                let renderer = this.get_view(ProblemDescriptionView);
                if (renderer == null) return;

                renderer.render(res, req.params.problem_name, req.session.user.username);
            });

            app.route("/problems/:problem_name/submit")
                .get(requireLogin, afterStart, beforeEnd, csrfProtected, async (req, res) => {
                    if (req.session == null) return;

                    let renderer = this.get_view(ProblemSubmitView);
                    if (renderer == null) return;

                    renderer.render(res, req.params.problem_name, req.session.user.username, req.csrfToken(), req.session.user.lang_choice);
                })
                .post(requireLogin, afterStart, beforeEnd, csrfProtected, async (req, res) => {
                    let code: string = "";

                    if (req.body.raw_code && req.body.raw_code.length > 4) {
                        code = req.body.raw_code;
                    } else if (req.files != null) {
                        if (req.files.code_file != null) {
                            code = (req.files.code_file as fileUpload.UploadedFile).data.toString();
                        }
                    }

                    if (req.session) {
                        let problem_data = this.scoringSystem.get_problem_by_dir_name(req.params.problem_name);
                        if (problem_data == null) return;

                        let lang = req.body.lang;
                        let problem = req.params.problem_name;

                        //Store the lang so it is set to what they choose next time
                        req.session.user.lang_choice = lang;

                        let test = {
                            code, lang, problem, time_limit: problem_data.time_limit
                        };

                        try {
                            let [job_id, start_time] = await this.ipc_server.request_test(test);
                            this.job_tracker.add_job(job_id, start_time, req.session.user.username, test);

                            res.redirect("/submissions/result?" + querystring.stringify({ id: job_id }));
                            return;
                        } catch (_) {
                            res.redirect("/submit_error");
                        }
                    }

                    res.redirect("/submit_error");
                });

            app.get("/submit_error", async (req, res) => {
                res.write("Something went wrong with your submission :(\nDon't worry, you're not going to be penalized for it since it is probably not your fault.");
                res.end();
            });

            app.get("/submissions/result", requireLogin, afterStart, async (req, res) => {
                if (req.session == null) return;

                let renderer = this.get_view(SubmissionResultView);
                if (renderer == null) return;

                renderer.render(res, req.query.id, req.session.user.username);
            });

            app.get("/submissions", requireLogin, afterStart, async (req, res) => {
                if (req.session == null) return;

                let renderer = this.get_view(SubmissionListView);
                if (renderer == null) return;

                renderer.render(res, req.session.user.username, req.query.problem);
            });
        }

        app.get("/leaderboard", async (req, res) => {
            // if (req.session == null) return;

            let view = this.get_view(LeaderboardView);
            if (view == null) return;

            let username = "";
            if (req.session && req.session.user)
                username = req.session.user.username;

            view.render(res, username);
        });

        app.get("/help", async (req, res) => {
            let username = "";
            if (req.session && req.session.user)
                username = req.session.user.username;

            let view = this.get_view(HelpView);
            if (view == null) return;
            view.render(res, username);
        });
    }

    public start(): [http.Server | null, https.Server | null] {
        try {
            let http_server = http.createServer(this.expressApp);
            let https_server = null;

            if (GLOBAL_CONFIG.SSL_PORT != -1) {
                let ssl_cert = fs.readFileSync(GLOBAL_CONFIG.SSL_CERTIFICATE_PATH, 'utf8');
                let ssl_key = fs.readFileSync(GLOBAL_CONFIG.SSL_KEY_PATH, 'utf8');

                let creds = {
                    cert: ssl_cert,
                    key: ssl_key
                };

                let https_server = https.createServer(creds, this.expressApp);
                https_server.listen(GLOBAL_CONFIG.SSL_PORT, () => { console.log("HTTPS Listening on port", GLOBAL_CONFIG.SSL_PORT); });
            }

            http_server.listen(GLOBAL_CONFIG.PORT, () => { console.log("HTTP Listening on port", GLOBAL_CONFIG.PORT); });

            return [http_server, https_server];
        } catch (err) {
            throw new Error("Failed loading SSL Credentials: " + err);
        }
    }
}
