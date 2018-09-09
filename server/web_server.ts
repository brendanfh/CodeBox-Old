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

import * as shared_types from "../shared/types";
import { UserModel } from "./models/user_model";

export default class WebServer {
    private expressApp: express.Application;
    private ipc_server: IPCServer;
    private job_tracker: JobTracker;
    private database: Database;

    public constructor(job_tracker: JobTracker, ipc_server: IPCServer, database: Database) {
        this.expressApp = express();
        this.setupApiRoutes();
        this.setupWebRoutes();

        this.job_tracker = job_tracker;
        this.ipc_server = ipc_server;
        this.database = database;
    }

    protected setupApiRoutes() {
        let app = this.expressApp;

        let api = express.Router();
        api.use(body_parser.json());

        api.post("/request_check", async (req, res) => {
            let test: shared_types.Submission = {
                id: genUUID(),
                problem: req.body.problem,
                lang: req.body.lang,
                code: req.body.code
            };

            let succ = this.ipc_server.request_test(test);
            if (succ) {
                let job_id = await this.ipc_server.wait_for_job_id(test.id);

                this.job_tracker.add_job(job_id, test);

                res.status(200);
                res.json({ id: job_id });
            } else {
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
            secret: "YOUSHOULDPROBABLYCHANGETHISTOBESOMETHINGBETTERSOON",
            name: "uuid",
            resave: false,
            saveUninitialized: false,
            cookie: {
                expires: false,
            }
        }));

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
            res.render("index", { name: "Brendan" });
        });

        app.route("/login")
            .get(redirectToLeaderboard, (req, res) => {
                res.render("login");
            })
            .post((req, res) => {
                let username = req.body.username,
                    password = req.body.password;

                this.database.getModel<UserModel>("User").findByUsername(username).then((user) => {
                    if (!user) {
                        res.redirect("/login");
                    } else if (!validate_password(user, password)) {
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
            });
    }

    public start() {
        const PORT = process.env.PORT || 8000;

        this.expressApp.listen(PORT, () => {
            console.log("Server started and listening on port:", PORT)
        });
    }
}
