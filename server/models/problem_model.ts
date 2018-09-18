import { BaseModel } from "./base_model";
import Sequelize from "sequelize";

export type ProblemModel_T = {
    dir_name: string, //Name as stored on the file system
    name: string, //Name from problem.json
    description: string, // Markdown string of problem description
    time_limit: number,
    letter: string,
    attempts: number,
    correct_attempts: number,
    timed_out_attempts: number,
    wrong_answer_attempts: number,
    other_bad_attempts: number,
}

export class ProblemModel extends BaseModel<ProblemModel_T> {

    constructor() {
        super();
        this.force_sync = false;
    }

    public static MODEL_NAME: string = "Problem";
    public getName() {
        return ProblemModel.MODEL_NAME;
    }

    protected getModelAttributes(): Sequelize.DefineModelAttributes<ProblemModel_T> {
        return {
            dir_name: {
                type: Sequelize.STRING,
                unique: true,
                allowNull: false
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            description: {
                type: Sequelize.STRING,
            },
            time_limit: {
                type: Sequelize.SMALLINT,
                allowNull: false
            },
            letter: {
                type: Sequelize.STRING,
                allowNull: false
            },
            attempts: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            correct_attempts: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            timed_out_attempts: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            wrong_answer_attempts: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            other_bad_attempts: {
                type: Sequelize.INTEGER,
                allowNull: false,
            }
        }
    }

    public async findOrCreate(dir_name: string, defaults: () => ProblemModel_T): Promise<Sequelize.Instance<ProblemModel_T> | null> {
        if (this.sql_model == null) return null;

        let res = await this.sql_model.findOne({
            where: {
                dir_name: dir_name,
            },
        });

        if (res == null) {
            return this.sql_model.create(defaults());
        } else {
            return res;
        }
    }

    public async update(values: ProblemModel_T): Promise<boolean> {
        if (this.sql_model == null) return false;

        let db_values: ProblemModel_T = {
            dir_name: values.dir_name,
            name: values.name,
            description: "",
            time_limit: values.time_limit,
            letter: values.letter,
            correct_attempts: values.correct_attempts,
            wrong_answer_attempts: values.wrong_answer_attempts,
            timed_out_attempts: values.timed_out_attempts,
            other_bad_attempts: values.other_bad_attempts,
            attempts: values.attempts
        };

        try {
            await this.sql_model.update(db_values, { where: { dir_name: values.dir_name } });
            return true;
        } catch (err) {
            return false;
        }
    }
}