export type IPCJobSubmission = {
	problem: string,
	lang: string,
	code: string
}

export type JobStatus
	= { kind: "STARTED" }
	| { kind: "BAD_LANGUAGE" }
	| { kind: "BAD_PROBLEM" }
	| { kind: "COMPILING" }
	| { kind: "COMPILE_ERR", err_msg: string }
	| { kind: "RUNNING", completed: number, total: number, total_run_time: number }
	| { kind: "COMPLETED", completed: number, total: number, total_run_time: number }
	| { kind: "WRONG_ANSWER", completed: number, total: number }
	| { kind: "TIME_LIMIT_EXCEEDED", completed: number, total: number }
	| { kind: "BAD_EXECUTION", completed: number, total: number }

export type Job = {
	id: JobID,          //Random UUID of the job
	username: string,   //Username of user who initiated the job
	status: JobStatus,  //Represents the status as seen above
	problem: string,    //The problem name
	lang: string,       //The language it's written in
	code: string        //The code that is to be compiled
}

export type JobID = string

export type CheckerUpdate
	= { job_id: JobID, status: JobStatus }
