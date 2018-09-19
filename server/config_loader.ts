import path from "path";
import fs from "fs";
import ScoringSystem from "./scoring_system";
import JobTracker from "./job_tracker";

export async function loadConfig(scoring: ScoringSystem) {
    if (process.env.ROOT_DIR == null) {
        throw new Error("ROOT_DIR not set");
    }

    let config_file_path = path.join(process.env.ROOT_DIR, "config.json");
    let config_contents = fs.readFileSync(config_file_path, { encoding: "utf8" });
    if (config_contents == null) {
        throw new Error("Reading config.json failed");
    }

    let config = JSON.parse(config_contents);

    scoring.set_start_time(config.start_time);
    scoring.set_end_time(config.end_time);

    for (let letter in config.problems) {
        let problem_dir = config.problems[letter];

        await scoring.load_problem(letter, problem_dir);
    }
}