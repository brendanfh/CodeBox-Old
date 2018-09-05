export type Submission = {
	id: string,
	problem: string,
	lang: string,
	code: string
}

export type JobStatus = "started" | "compiling" | "running" | "error" | "completed";

export type CheckerUpdate
	= { kind: "COMPLETION_UPDATE", job_id: string, completed: number, total: number }
	| { kind: "STATUS_UPDATE", status: JobStatus }
	| { kind: "BAD_LANGUAGE", job_id: string }
	| { kind: "COMPILE_ERR", job_id: string, err_msg: string }
	| { kind: "WRONG_ANSWER", job_id: string, completed: number, total: number }
	| { kind: "TIME_LIMIT_EXCEEDED", job_id: string, completed: number, total: number }
