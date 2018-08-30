import { CExecuter } from "./executers/c_executer";

async function main() {
	let ex = new CExecuter();
	await ex.execute();
	console.log("ASDF");
}

main();
