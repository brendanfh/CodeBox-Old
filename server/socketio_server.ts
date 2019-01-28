import socket_io from "socket.io";
import http from "http";
import https from "https";
import JobTracker from "./job_tracker";
import { JobStatus } from "../shared/types";
import ScoringSystem from "./scoring_system";
import { UserModel } from "./models/user_model";
import { IInjectable, Kernel } from "../shared/injection/injection";

export class SocketIOServer implements IInjectable {

    private io: socket_io.Server | null = null;
    private io_ssl: socket_io.Server | null = null;
    private job_tracker: JobTracker;
    private scoring_system: ScoringSystem;
    private user_model: UserModel;

    private subscriptions: {
        "submission_updates": Map<string, socket_io.Socket | null>,
        "leaderboard_updates": Map<string, socket_io.Socket>,
    };
    constructor(kernel: Kernel) {
        this.job_tracker = kernel.get<JobTracker>("JobTracker");
        this.scoring_system = kernel.get<ScoringSystem>("ScoringSystem");
        this.user_model = kernel.get<UserModel>("UserModel");

        this.subscriptions = {
            "submission_updates": new Map(),
            "leaderboard_updates": new Map()
        };
    }

    protected on_connection(socket: socket_io.Socket) {
        socket.on("request_submission_updates", async (data) => {
            if (data.job_id == null) return;

            this.subscriptions["submission_updates"].set(data.job_id, socket);

            let job = await this.job_tracker.get_job(data.job_id);
            if (job != null) {
                //Send the status as it is right now
                socket.emit("submission_update", job.status);
            }
        });

        socket.on("request_leaderboard_updates", async (data) => {
            this.subscriptions["leaderboard_updates"].set(socket.id, socket);

            this.push_single_leaderboard_update(socket, undefined, undefined);
        });

        socket.on("disconnect", () => {
            this.remove_leaderboard_subscription(socket);
        });
    }

    public push_submission_update(job_id: string, status: JobStatus) {
        let m_socket = this.subscriptions["submission_updates"].get(job_id);
        if (m_socket) {
            m_socket.emit("submission_update", status);
        }
    }

    private async push_single_leaderboard_update(socket: socket_io.Socket, nickname_map: { [k: string]: string } | undefined, problem_map: { [k: string]: string } | undefined) {
        let scores = this.scoring_system.current_scores;

        if (nickname_map == undefined) {
            nickname_map = {};
            let users = await this.user_model.findAll();
            for (let user of users) {
                nickname_map[user.username] = user.nickname;
            }
        }

        if (problem_map == undefined) {
            problem_map = {};
            for (let prob of this.scoring_system.get_problems()) {
                if (prob.kind != "word")
                    problem_map[prob.letter] = prob.dir_name;
            }
        }

        socket.emit("leaderboard_update", {
            scores: [...scores],
            nickname_map,
            problem_map,
            start_time: this.scoring_system.get_start_time(),
            end_time: this.scoring_system.get_end_time()
        });
    }

    public async push_leaderboard_update() {
        let nickname_map: { [k: string]: string } = {};
        let users = await this.user_model.findAll();
        for (let user of users) {
            nickname_map[user.username] = user.nickname;
        }

        let problem_map: { [k: string]: string } = {};
        for (let prob of this.scoring_system.get_problems()) {
            if (prob.kind != "word")
                problem_map[prob.letter] = prob.dir_name;
        }

        for (let socket of this.subscriptions["leaderboard_updates"].values()) {
            this.push_single_leaderboard_update(socket, nickname_map, problem_map);
        }
    }

    public remove_submission_subscription(job_id: string) {
        this.subscriptions["submission_updates"].delete(job_id);
    }

    public remove_leaderboard_subscription(socket: socket_io.Socket) {
        this.subscriptions["leaderboard_updates"].delete(socket.id);
    }

    public connect_to_http_server(server: http.Server) {
        this.io = socket_io(server);
    }

    public connect_to_https_server(server: https.Server) {
        this.io_ssl = socket_io(server);
    }

    public start_server() {
        if (this.io != null)
            this.io.on('connection', this.on_connection.bind(this));

        if (this.io_ssl != null)
            this.io_ssl.on('connection', this.on_connection.bind(this));
    }
}