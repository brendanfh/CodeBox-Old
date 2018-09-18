import Sequelize from "sequelize";
import { BaseModel } from "./base_model";

export type UserScoreModel_T = {
    problems_solved: string,
    total_time: number
}

export class UserScoreModel extends BaseModel<UserScoreModel_T> {
    public getName(): string {
        return "UserScore";
    }

    protected getModelAttributes(): Sequelize.DefineModelAttributes<UserScoreModel_T> {
        throw new Error("Method not implemented.");
    }
}