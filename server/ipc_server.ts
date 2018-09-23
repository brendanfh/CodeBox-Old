import * as ipc from "node-ipc";
import * as net from "net";
import path from "path";

const genUUID = require("uuid/v4");

import * as shared_types from "../shared/types";
import JobTracker from "./job_tracker";

type IPCServerEvent
    = "cctester.set_job_id"
    | "cctester.job_status_update"
    | "cctester.job_completed";

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

    protected event_listeners: Map<IPCServerEvent, ((data: any, socket: any) => void)[]>;

    public constructor() {
        this.event_listeners = new Map();
        this.event_listeners.set("cctester.set_job_id", []);
        this.event_listeners.set("cctester.job_status_update", []);
        this.event_listeners.set("cctester.job_completed", []);
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
            let events = this.event_listeners.get("cctester.set_job_id");
            if (events != null) {
                for (let func of events) {
                    func(data, socket);
                }
            }

            if (data.ret_id != undefined && data.job_id != undefined) {
                this.resolve_map["wait_for_job_id"][data.ret_id]([data.job_id, data.time]);
            }
        });

        ipc.server.on("cctester.job_status_update", (data, socket) => {
            let events = this.event_listeners.get("cctester.job_status_update");
            if (events != null) {
                for (let func of events) {
                    func(data, socket);
                }
            }
        });

        ipc.server.on("cctester.job_completed", (data, socket) => {
            let events = this.event_listeners.get("cctester.job_completed");
            if (events != null) {
                for (let func of events) {
                    func(data, socket);
                }
            }

            if (data.job_id != undefined &&
                this.resolve_map["wait_for_job_completion"][data.job_id] != undefined) {
                this.resolve_map["wait_for_job_completion"][data.job_id](void 0);
            }
        });

        ipc.server.on("socket.disconnected", () => {
            this.cctester_socket = null;
        });
    }

    public add_event_listener(event: IPCServerEvent, func: (data: any, socket: any) => void) {
        let event_arr = this.event_listeners.get(event);
        if (event_arr != null) {
            event_arr.push(func);
        }
    }

    //Returns whether or not it has a connected ipc-socket
    public async request_test(sub: shared_types.IPCJobSubmission): Promise<[shared_types.JobID, number]> {
        if (this.cctester_socket == null) {
            throw "Socket not connected";
        }

        let ret_id: string = genUUID();

        try {
            ipc.server.emit(this.cctester_socket, "cctester.create_job", { ret_id, sub });
        } catch (err) {
            throw "Socket not connect";
        }
        let job_info = await this.wait_for_job_id(ret_id);
        return job_info;
    }

    public wait_for_job_id(ret_id: string): Promise<[shared_types.JobID, number]> {
        return new Promise((res, rej) => {
            this.resolve_map["wait_for_job_id"][ret_id] = res;
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