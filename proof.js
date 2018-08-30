const { spawn } = require("child_process");

//This wraps the exiting of a child process in a promise so async / await monad works
function onChildExit(childProc) {
	return new Promise((res, rej) => {
		childProc.on("exit", () => {
			console.log("CHILD IS EXITING");
			res({msg: "COMPLETED IN TIME"})
		});
	});
}

//This wraps a timer up in a promise so async/await works
function promiseTimer(timeLimit) {
	return new Promise((res, rej) => {
		setTimeout(res, timeLimit, { shouldKill: true, msg: "FAILED TO COMPLETE IN TIME" });
	});
}

//This promise returns which ever on of these finishes first
function runTests(child, timeLimit) {
	return Promise.race([onChildExit(child), promiseTimer(timeLimit)]);
}

async function compileAndRunFile() {
	//This compiles the cpp program into an output file
	let child = spawn("gcc", ["cfiles/test1.c", "-o", "bin/temp1"]);

	//This waits until the g++ program exits
	await onChildExit(child);

	//This launches a new bash shell
	let child2 = spawn("bash");

	//This setups output retrival from the new bash shell
	let totalOutput = "";
	child2.stdout.on("data", (data) => totalOutput += data.toString());

	//This ends the command below and actually runs the program
	child2.stdin.end("./bin/temp1 < ./testfiles/test1");

	//This waits until the test completes or the time runs out
	let result = await runTests(child2, 100);

	//If the time ran out then we kill the process to make sure loops are closed
	if (result.shouldKill) {
		child2.kill();
	}

	console.log(result);
	console.log(totalOutput);
};

compileAndRunFile();

//child.on("exit", function() {
//
//	let child2 = spawn("./bin/temp1");
//
//	let totalOutput = "";
//	child2.stdout.on("data", function(data) {
//		totalOutput += data.toString();
//	});
//
//	let wasKilled = false;
//	let killTimeout = setTimeout(function() {
//		child2.kill();
//		wasKilled = true;
//
//		console.log("Sub Process Killed.");
//		console.log("Output was:");
//		console.log(totalOutput);
//	}, 2010);
//
//	child2.on("exit", function() {
//		if (wasKilled) return;
//		clearTimeout(killTimeout);
//
//		console.log("Sub Process died in the alloted time");
//		console.log("Output was:");
//		console.log(totalOutput);
//	});
//});
