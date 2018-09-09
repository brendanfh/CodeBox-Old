import * as ipc from "node-ipc";
import * as net from "net";
import path from "path";

import * as shared_types from "../shared/types";
import JobTracker from "./job_tracker";

export default class IPCServer {
    protected cctester_socket: net.Socket | null = null;
    protected resolve_map: {
        [k: string]: {
            [k: string]: (n: any) => void
        }
    } = {
            "wait_for_job_id": {},
            "wait_for_job_completion": {}
        };

    protected job_tracker: JobTracker;

    public constructor(job_tracker: JobTracker) {
        this.job_tracker = job_tracker;
    }

    public init() {
        ipc.config.id = "ccmaster";
        ipc.config.retry = 5000;

        ipc.serve(this.setupEvents.bind(this));
    }

    protected setupEvents() {
        ipc.server.on("cctester.connect", (data, socket) => {
            this.cctester_socket = socket;
        });

        ipc.server.on("cctester.set_job_id", (data, socket) => {
            if (data.submission_id != undefined && data.job_id != undefined) {
                this.resolve_map["wait_for_job_id"][data.submission_id](data.job_id);
            }
        });

        ipc.server.on("cctester.job_status_update", (data, socket) => {
            if (data.job_id != undefined && data.status != undefined) {
                this.job_tracker.update_job(data.job_id, data.status);
            }
        });

        ipc.server.on("cctester.job_completed", (data, socket) => {
            if (data.job_id != undefined &&
                this.resolve_map["wait_for_job_completion"][data.job_id] != undefined) {
                this.resolve_map["wait_for_job_completion"][data.job_id](void 0);
            }
        });
    }

    //Returns whether or not it has a connected ipc-socket
    public request_test(sub: shared_types.Submission): boolean {
        if (this.cctester_socket == null) {
            return false;
        }

        ipc.server.emit(this.cctester_socket, "cctester.create_job", sub)
        return true;
    }

    public wait_for_job_id(sub_id: string): Promise<shared_types.JobID> {
        return new Promise((res, rej) => {
            this.resolve_map["wait_for_job_id"][sub_id] = res;
        });
    }

    public wait_for_job_completion(id: string): Promise<number> {
        return new Promise((res, rej) => {
            this.resolve_map["wait_for_job_completion"][id] = res;
        });
    }

    public start() {
        ipc.server.start();
    }

    public stop() {
        ipc.server.stop();
    }
}