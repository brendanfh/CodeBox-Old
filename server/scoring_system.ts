import { ProblemModel, ProblemModel_T } from "./models/problem_model";
import path from "path";
import fs from "fs";
import { Database } from "./database";


export default class ScoringSystem {
    private problems: Map<string, ProblemModel_T>;
    private database: Database;

    constructor(database: Database) {
        this.problems = new Map<string, ProblemModel_T>();
        this.database = database;
    }

    public async load_problems(): Promise<void> {
        if (process.env.ROOT_DIR == undefined) {
            throw new Error("ROOT_DIR IS NOT SET");
        }

        let problem_dir = path.join(process.env.ROOT_DIR, "/problems");

        let problem_names = fs.readdirSync(problem_dir).filter(p =>
            fs.statSync(path.join(problem_dir, p)).isDirectory()
        )

        for (let name of problem_names) {
            let problem = await this.database.getModel<ProblemModel>("Problem").findOrCreate(
                name,
                () => {
                    let problem_files = fs.readdirSync(path.join(problem_dir, name));

                    let description_file = problem_files
                        .filter(p => /[a-zA-Z0-9]+\.md/g.exec(p) != null)[0];

                    let description = fs.readFileSync(path.join(problem_dir, name, description_file), { encoding: "utf8" });

                    let time_limit_file = problem_files
                        .filter(p => /time_limit/g.exec(p))[0];

                    let time_limit_contents = fs.readFileSync(path.resolve(problem_dir, name, time_limit_file), { encoding: "utf8" });
                    let time_limit: number = 0.0;
                    try {
                        time_limit = parseInt(time_limit_contents);
                    } catch (err) {
                        throw new Error("Failed parsing time limit file for problem: " + name);
                    }

                    return {
                        name: name,
                        description: description,
                        time_limit: time_limit,
                        correct_attempts: 0,
                        attempts: 0,
                    }
                }
            )

            if (problem == null) continue;
            this.problems.set(name, problem.get());
        }
    }

    public getPromblem(name: string): ProblemModel_T | undefined {
        return this.problems.get(name);
    }
}