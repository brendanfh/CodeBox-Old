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
import fileUpload from "express-fileupload";
import querystring from "querystring";

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
                        let user = await this.database.getModel(UserModel).create({
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

        problems: {

            app.get("/problems/:problem_name", requireLogin, async (req, res) => {
                if (req.session == null) return;

                let problem = this.scoringSystem.getProblem(req.params.problem_name);

                if (problem == undefined) {
                    res.render("problem/description", {
                        navbar: { selected_tab: 1 },
                        problem_description: `<span>Problem "${req.params.problem_name}" not found.</span>`
                    });
                    return;
                }

                let showdown_conv = new showdown.Converter();
                let desc_html = showdown_conv.makeHtml(problem.description);

                let sidebar_problems = [];

                let all_problems = this.scoringSystem.getProblems();
                for (let prob of all_problems) {
                    sidebar_problems.push({
                        name: prob.name,
                        dir_name: prob.dir_name,
                        completed: true,
                        wrong_attempt: true,
                    });
                }

                let has_submissions: boolean = false;
                for await (let j of this.job_tracker.get_jobs_by_username_and_problem(req.session.user.username, req.params.problem_name)) {
                    has_submissions = true;
                    break;
                }

                res.render("problem/description", {
                    navbar: { selected_tab: 1 },
                    problem: {
                        description: desc_html,
                        dir_name: problem.dir_name,
                        name: problem.name,
                        wrong_answer_attempts: problem.wrong_answer_attempts,
                        other_bad_attempts: problem.other_bad_attempts,
                        timed_out_attempts: problem.timed_out_attempts,
                        correct_attempts: problem.correct_attempts,
                        attempts: problem.attempts,
                        time_limit: (problem.time_limit / 1000).toString() + " seconds",
                        has_submissions
                    },
                    sidebar_problems
                });
            });

            app.route("/problems/:problem_name/submit")
                .get(requireLogin, (req, res) => {
                    let problem = this.scoringSystem.getProblem(req.params.problem_name);

                    if (problem == undefined) {
                        res.render("problem/description", {
                            navbar: { selected_tab: 1 },
                            problem_description: `<span>Problem "${req.params.problem_name}" not found.</span>`
                        })
                        return;
                    }

                    let sidebar_problems = [];
                    let all_problems = this.scoringSystem.getProblems();
                    for (let prob of all_problems) {
                        sidebar_problems.push({
                            name: prob.name,
                            dir_name: prob.dir_name,
                            completed: true,
                            wrong_attempt: true,
                        });
                    }

                    res.render("problem/submit", {
                        navbar: { selected_tab: 1 },
                        problem: {
                            dir_name: problem.dir_name,
                            name: problem.name,
                        },
                        sidebar_problems
                    });
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

                            let job_id = await this.ipc_server.request_test(test);
                            this.job_tracker.add_job(job_id, req.session.user.username, test);

                            res.redirect("/submission_results?" + querystring.stringify({ id: job_id }));
                            return;
                        }
                    }

                    res.redirect("/submit_error");
                });

            app.get("/submission_results", requireLogin, (req, res) => {
                res.json({});
            });
        }
    }

    public start() {
        const PORT = process.env.PORT || 8000;

        this.expressApp.listen(PORT, () => {
            console.log("Server started and listening on port:", PORT)
        });
    }
}
