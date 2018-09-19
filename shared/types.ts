export type IPCJobSubmission = {
	problem: string,
	lang: string,
	code: string,
	time_limit: number
}

export type JobStatusStrs
	= "STARTED"
	| "BAD_LANGUAGE"
	| "BAD_PROBLEM"
	| "COMPILING"
	| "COMPILE_ERR"
	| "RUNNING"
	| "COMPLETED"
	| "WRONG_ANSWER"
	| "TIME_LIMIT_EXCEEDED"
	| "BAD_EXECUTION";

export type JobStatus
	= { kind: "STARTED" }
	| { kind: "BAD_LANGUAGE" }
	| { kind: "BAD_PROBLEM" }
	| { kind: "COMPILING" }
	| { kind: "COMPILE_ERR", err_msg: string }
	| { kind: "RUNNING", completed: number, total: number, run_times: Array<number> }
	| { kind: "COMPLETED", completed: number, total: number, run_times: Array<number> }
	| { kind: "WRONG_ANSWER", completed: number, total: number, run_times: Array<number> }
	| { kind: "TIME_LIMIT_EXCEEDED", completed: number, total: number, run_times: Array<number> }
	| { kind: "BAD_EXECUTION", completed: number, total: number, run_times: Array<number> }

export type Job = {
	id: JobID,             //Random UUID of the job
	username: string,      //Username of user who initiated the job
	status: JobStatus,     //Represents the status as seen above
	problem: string,       //The problem name
	lang: string,          //The language it's written in
	code: string           //The code that is to be compiled
	time_initiated: number //The time that this job was created
}

export type JobID = string

export type CheckerUpdate
	= { job_id: JobID, status: JobStatus }
