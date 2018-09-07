export type Submission = {
	id: string,
	problem: string,
	lang: string,
	code: string
}

export type JobStatus
	= { kind: "STARTED" }
	| { kind: "BAD_LANGUAGE" }
	| { kind: "COMPILING" }
	| { kind: "COMPILE_ERR", err_msg: string }
	| { kind: "RUNNING", completed: number, total: number }
	| { kind: "WRONG_ANSWER", completed: number, total: number }
	| { kind: "TIME_LIMIT_EXCEEDED", completed: number, total: number }
	| { kind: "COMPLETED", completed: number, total: number }

export type Job = {
	id: JobID,
	status: JobStatus,
	submission: Submission
}

export type JobID = string

export type CheckerUpdate
	= { job_id: JobID, status: JobStatus }
