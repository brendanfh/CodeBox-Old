import path from "path";

import express from "express";
import body_parser from "body-parser";
import IPCServer from "./ipc_server";
import JobTracker from "./job_tracker";
import { Database } from "./database";

const genUUID = require("uuid/v4");
import morgan from "morgan";
import cookieParser from "cookie-parser";
import session from "express-session";

import showdown from "showdown";

import * as shared_types from "../shared/types";
import { UserModel } from "./models/user_model";
import ScoringSystem from "./scoring_system";

export default class WebServer {
    private expressApp: express.Application;
    private ipc_server: IPCServer;
    private job_tracker: JobTracker;
    private database: Database;
    private scoringSystem: ScoringSystem;

    public constructor(job_tracker: JobTracker, ipc_server: IPCServer, database: Database, scoringSystem: ScoringSystem) {
        this.expressApp = express();
        this.setupApiRoutes();
        this.setupWebRoutes();

        this.job_tracker = job_tracker;
        this.ipc_server = ipc_server;
        this.database = database;
        this.scoringSystem = scoringSystem;
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
                this.job_tracker.add_job(job_id, "", test);

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
            secret: genUUID(),
            name: "uuid",
            resave: false,
            saveUninitialized: false,
            cookie: {
                expires: false,
            }
        }));

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

        app.engine('ejs', require('express-ejs-extend'));
        app.set('views', path.resolve(process.cwd(), "web/views"));
        app.set('view engine', 'ejs');

        app.use("/static", express.static(path.resolve(process.cwd(), "web/static")));

        app.get("/", (req, res) => {
            if (req.session && req.session.user)
                res.render("index", {
                    navbar: { selected_tab: 0 },
                    name: req.session.user.first_name
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
                        navbar: { selected_tab: 0 },
                    });
                })
                .post(async (req, res) => {
                    let username = req.body.username,
                        password = req.body.password;

                    let user = await this.database.getModel<UserModel>("User").findByUsername(username);
                    if (!user) {
                        res.redirect("/login");
                    } else if (!(await UserModel.validatePassword(user.getDataValue("password_hash"), password))) {
                        res.redirect("/login");
                    } else {
                        if (req.session) {
                            req.session.user = {
                                username: user.getDataValue("username"),
                                email: user.getDataValue("email"),
                                first_name: user.getDataValue("first_name"),
                                last_name: user.getDataValue("last_name"),
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
                    res.render("signup");
                })
                .post(async (req, res) => {
                    try {
                        let user = await this.database.getModel<UserModel>("User").create({
                            username: req.body.username,
                            email: "",
                            password_hash: await UserModel.generatePassword(req.body.password),
                            first_name: "UNKNOWN",
                            last_name: "UNKNOWN"
                        });

                        if (req.session && user != null) {
                            req.session.user = {
                                username: user.getDataValue("username"),
                                email: user.getDataValue("email"),
                                first_name: user.getDataValue("first_name"),
                                last_name: user.getDataValue("last_name"),
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

        app.get("/problem/:problem_name", (req, res) => {
            let problem = this.scoringSystem.getPromblem(req.params.problem_name);

            if (problem == undefined) {
                res.render("problem_description", {
                    navbar: { selected_tab: 1 },
                    problem_description: `<span>Problem "${req.params.problem_name}" not found.</span>`
                });
                return;
            }

            let showdown_conv = new showdown.Converter();
            let html = showdown_conv.makeHtml(problem.description);

            res.render("problem_description", {
                navbar: { selected_tab: 1 },
                problem_description: html
            });
        });
    }

    public start() {
        const PORT = process.env.PORT || 8000;

        this.expressApp.listen(PORT, () => {
            console.log("Server started and listening on port:", PORT)
        });
    }
}
