import Sequelize from "sequelize";
import { BaseModel } from "./base_model";

type UserModel_T = {
    user_id: string,
    first_name: string,
    last_name: string,
    email: string,
}

export class UserModel extends BaseModel<UserModel_T> {

    constructor() {
        super("User");
    }

    protected getModelAttributes(): Sequelize.DefineModelAttributes<UserModel_T> {
        return {
            user_id: {
                type: Sequelize.UUIDV4,
            },
            first_name: {
                type: Sequelize.STRING,
            },
            last_name: {
                type: Sequelize.STRING
            },
            email: {
                type: Sequelize.STRING,
            }
        }
    }

    //Convenience Functions
    public async findById(id: string): Promise<UserModel_T | null> {
        if (this.sql_model == null) return Promise.resolve(null);
        return await this.sql_model.findOne({
            where: {
                user_id: id
            }
        });
    }
}