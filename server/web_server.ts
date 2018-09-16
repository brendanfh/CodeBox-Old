import path from "path";

import express from "express";
import http from "http";
import body_parser from "body-parser";
import IPCServer from "./ipc_server";
import JobTracker from "./job_tracker";
import { Database } from "./database";

const genUUID = require("uuid/v4");
import morgan from "morgan";
import cookieParser from "cookie-parser";
import session from "express-session";
import fileUpload from "express-fileupload";
import querystring from "querystring";

import showdown from "showdown";

import * as shared_types from "../shared/types";
import { UserModel } from "./models/user_model";
import ScoringSystem from "./scoring_system";
import { BaseRenderer } from "./renderers/base_renderer";
import { ProblemDescriptionRenderer } from "./renderers/problem_description_renderer";
import { ProblemSubmitRenderer } from "./renderers/problem_submit_renderer";
import { SubmissionResultRenderer } from "./renderers/submission_result_renderer";
import { SubmissionListRenderer } from "./renderers/submission_list_renderer";

interface IRenderer {
    RENDERER_NAME: string;
    new(jt: JobTracker, ss: ScoringSystem, db: Database): BaseRenderer;
}

export default class WebServer {
    private expressApp: express.Application;
    private ipc_server: IPCServer;
    private job_tracker: JobTracker;
    private database: Database;
    private scoringSystem: ScoringSystem;

    private renderers: Map<string, BaseRenderer>;

    public constructor(job_tracker: JobTracker, ipc_server: IPCServer, database: Database, scoringSystem: ScoringSystem) {
        this.expressApp = express();
        this.setupApiRoutes();
        this.setupWebRoutes();

        this.job_tracker = job_tracker;
        this.ipc_server = ipc_server;
        this.database = database;
        this.scoringSystem = scoringSystem;

        this.renderers = new Map();

        this.add_renderer(ProblemDescriptionRenderer);
        this.add_renderer(ProblemSubmitRenderer);
        this.add_renderer(SubmissionResultRenderer);
        this.add_renderer(SubmissionListRenderer);
    }

    private add_renderer(renderer: IRenderer) {
        let ren = new renderer(this.job_tracker, this.scoringSystem, this.database);

        this.renderers.set(renderer.RENDERER_NAME, ren);
    }

    private get_renderer(renderer: IRenderer): BaseRenderer | undefined {
        return this.renderers.get(renderer.RENDERER_NAME);
    }

    protected setupApiRoutes() {
        let app = this.expressApp;

        let api = express.Router();
        api.use(body_parser.json());

        api.post("/request_check", async (req, res) => {
            let test: shared_types.IPCJobSubmission = {
                problem: req.body.problem,
                lang: req.body.lang,
                code: req.body.code
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
            if (req.cookies.uuid && !(req.session ? req.session.user : true)) {
                res.clearCookie("uuid");
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
        }

        app.engine('ejs', require('ejs-mate'));
        app.set('views', path.resolve(process.cwd(), "web/views"));
        app.set('view engine', 'ejs');

        app.use("/static", express.static(path.resolve(process.cwd(), "web/static")));

        app.get("/", (req, res) => {
            if (req.session && req.session.user)
                res.render("index", {
                    navbar: { selected_tab: 0 },
                    name: req.session.user.nickname
                });
            else
                res.render("index", {
                    navbar: { selected_tab: 0 },
                    name: ""
                });
        });

        login: {
            app.route("/login")
                .get(redirectToLeaderboard, (req, res) => {
                    res.render("login", {
                        navbar: { selected_tab: -1 },
                    });
                })
                .post(async (req, res) => {
                    let username = req.body.username,
                        password = req.body.password;

                    let user = await this.database.getModel(UserModel).findByUsername(username);
                    if (!user) {
                        res.redirect("/login");
                    } else if (!(await UserModel.validatePassword(user.getDataValue("password_hash"), password))) {
                        res.redirect("/login");
                    } else {
                        if (req.session) {
                            req.session.user = {
                                username: user.getDataValue("username"),
                                email: user.getDataValue("email"),
                                nickname: user.getDataValue("nickname"),
                            };
                        }
                        res.redirect("/");
                    }
                });
        }

        app.get("/logout", (req, res) => {
            if (req.session)
                req.session.user = null;

            res.redirect("/login");
        });

        signup: {
            app.route("/signup")
                .get(redirectToLeaderboard, (req, res) => {
                    res.render("signup", { navbar: { selected_tab: -1 } });
                })
                .post(async (req, res) => {
                    try {
                        if (req.body.password != req.body.confirm_password) {
                            throw new Error("Passwords do not match");
                        }

                        let user = await this.database.getModel(UserModel).create({
                            username: req.body.username,
                            email: req.body.email,
                            password_hash: await UserModel.generatePassword(req.body.password),
                            nickname: req.body.nickname
                        });

                        if (req.session && user != null) {
                            req.session.user = {
                                username: user.getDataValue("username"),
                                email: user.getDataValue("email"),
                                nickname: user.getDataValue("nickname"),
                            };
                        }

                        res.redirect("/");
                    }
                    catch (err) {
                        console.log(err);
                        res.redirect("/signup");
                    }
                })
        }

        problems: {
            app.get("/problems/:problem_name", requireLogin, async (req, res) => {
                if (req.session == null) return;

                let renderer = this.get_renderer(ProblemDescriptionRenderer);
                if (renderer == null) return;

                renderer.render(res, req.params.problem_name, req.session.user.username);
            });

            app.route("/problems/:problem_name/submit")
                .get(requireLogin, async (req, res) => {
                    if (req.session == null) return;

                    let renderer = this.get_renderer(ProblemSubmitRenderer);
                    if (renderer == null) return;

                    renderer.render(res, req.params.problem_name, req.session.user.username);
                })
                .post(requireLogin, async (req, res) => {
                    if (req.files != null && req.session) {
                        if (req.files.code_file != null) {
                            let code = (req.files.code_file as fileUpload.UploadedFile).data.toString();
                            let lang = req.body.lang;
                            let problem = req.params.problem_name;
                            let test = {
                                code, lang, problem
                            };

                            let [job_id, start_time] = await this.ipc_server.request_test(test);
                            this.job_tracker.add_job(job_id, start_time, req.session.user.username, test);

                            res.redirect("/submission_results?" + querystring.stringify({ id: job_id }));
                            return;
                        }
                    }

                    res.redirect("/submit_error");
                });

            app.get("/submission_results", requireLogin, async (req, res) => {
                if (req.session == null) return;

                let renderer = this.get_renderer(SubmissionResultRenderer);
                if (renderer == null) return;

                renderer.render(res, req.query.id, req.session.user.username);
            });

            app.get("/submissions", requireLogin, async (req, res) => {
                if (req.session == null) return;

                let renderer = this.get_renderer(SubmissionListRenderer);
                if (renderer == null) return;

                renderer.render(res, req.session.user.username, req.query.problem);
            });
        }
    }

    public start(): http.Server {
        const PORT = process.env.PORT || 8000;

        return this.expressApp.listen(PORT, () => {
            console.log("Server started and listening on port:", PORT)
        });
    }
}
