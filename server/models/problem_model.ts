import { BaseModel } from "./base_model";
import Sequelize from "sequelize";

export type ProblemModel_T = {
    dir_name: string, //Name as stored on the file system
    name: string, //Name from problem.json
    description: string, // Markdown string of problem description
    time_limit: number,
    attempts: number,
    correct_attempts: number,
    timed_out_attempts: number,
    wrong_answer_attempts: number,
    other_bad_attempts: number,
}

export class ProblemModel extends BaseModel<ProblemModel_T> {

    constructor() {
        super();
        this.force_sync = true;
    }

    public getName(): string {
        return "Problem";
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
                unique: false,
                allowNull: false,
            },
            time_limit: {
                type: Sequelize.SMALLINT,
                unique: false,
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

    public async findOrCreate(name: string, defaults: () => ProblemModel_T): Promise<Sequelize.Instance<ProblemModel_T> | null> {
        if (this.sql_model == null) return null;

        let res = await this.sql_model.findOne({
            where: {
                name: name,
            },
        });

        if (res == null) {
            return this.sql_model.create(defaults());
        } else {
            return res;
        }
    }
}