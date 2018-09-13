export type IPCJobSubmission = {
	problem: string,
	lang: string,
	code: string
}

export type TestCaseStatus = {
	status: "RUNNING" | "COMPLTETED" | "WRONG_ANSWER" | "TIME_LIMIT_EXECEEDED",
	run_time: number
}

export type JobStatus
	= { kind: "STARTED" }
	| { kind: "BAD_LANGUAGE" }
	| { kind: "BAD_PROBLEM" }
	| { kind: "COMPILING" }
	| { kind: "COMPILE_ERR", err_msg: string }
	| { kind: "BAD_EXECUTION" }
	| {
		kind: "RUNNING",
		test_number: number,
		test_cases: Array<TestCaseStatus>
	}
	| {
		kind: "COMPLETED",
		test_cases: Array<TestCaseStatus>
	}

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
