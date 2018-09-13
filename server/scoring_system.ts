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

        for (let dir_name of problem_names) {
            let problem = await this.database.getModel(ProblemModel).findOrCreate(
                dir_name,
                () => {
                    let problem_files = fs.readdirSync(path.join(problem_dir, dir_name));

                    let description_file = problem_files
                        .filter(p => /[a-zA-Z0-9]+\.md/g.exec(p) != null)[0];

                    let description = fs.readFileSync(path.join(problem_dir, dir_name, description_file), { encoding: "utf8" });

                    let info_file = problem_files
                        .filter(p => /problem\.json/g.exec(p))[0];

                    let info_contents = fs.readFileSync(path.resolve(problem_dir, dir_name, info_file), { encoding: "utf8" });
                    let time_limit: number = 0.0;
                    let name: string = "";

                    try {
                        let problem_info = JSON.parse(info_contents);

                        if (problem_info.time_limit && problem_info.name) {
                            time_limit = parseInt(problem_info.time_limit);
                            name = problem_info.name;
                        } else {
                            throw new Error();
                        }
                    } catch (err) {
                        throw new Error("Failed parsing time limit or name for problem: " + dir_name);
                    }

                    return {
                        dir_name: dir_name,
                        name: name,
                        description: description,
                        time_limit: time_limit,
                        correct_attempts: 8,
                        timed_out_attempts: 4,
                        wrong_answer_attempts: 5,
                        other_bad_attempts: 2,
                        attempts: 19,
                    }
                }
            )

            if (problem == null) continue;
            this.problems.set(dir_name, problem.get());
        }
    }

    public getPromblem(name: string): ProblemModel_T | undefined {
        return this.problems.get(name);
    }
}