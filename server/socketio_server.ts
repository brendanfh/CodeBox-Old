import socket_io from "socket.io";
import http from "http";
import JobTracker from "./job_tracker";
import { JobStatus } from "../shared/types";

export class SocketIOServer {

    private io: socket_io.Server | null = null;
    private job_tracker: JobTracker;

    private subscriptions: {
        "submission_updates": Map<string, socket_io.Socket | null>,
        "leaderboard_updates": Map<string, socket_io.Socket>,
    };

    constructor(job_tracker: JobTracker) {
        this.job_tracker = job_tracker;

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

        socket.on("request_leaderboard_update", async (data) => {
            this.subscriptions["leaderboard_updates"].set(socket.id, socket);
        });
    }

    public push_submission_update(job_id: string, status: JobStatus) {
        let m_socket = this.subscriptions["submission_updates"].get(job_id);
        if (m_socket) {
            m_socket.emit("submission_update", status);
        }
    }

    public push_leaderboard_update() {
        for (let socket of this.subscriptions["leaderboard_updates"].values()) {
            //Send out updates
        }
    }

    public remove_subscription(job_id: string) {
        this.subscriptions["submission_updates"].delete(job_id);
    }

    public connect_to_http_server(server: http.Server) {
        this.io = socket_io(server);
    }

    public start_server() {
        if (this.io != null)
            this.io.on('connection', this.on_connection.bind(this));
    }
}