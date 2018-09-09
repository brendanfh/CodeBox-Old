import Sequelize from "sequelize";
import { BaseModel } from "./base_model";

type UserModel_T = {
    username: string,
    password: string,
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
            username: {
                type: Sequelize.STRING,
                unique: true,
                allowNull: false,
            },
            password: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            first_name: {
                type: Sequelize.STRING,
            },
            last_name: {
                type: Sequelize.STRING
            },
            email: {
                type: Sequelize.STRING,
                unique: true,
                allowNull: false,
            }
        }
    }

    //Convenience Functions
    public async findByUsername(username: string): Promise<Sequelize.Instance<UserModel_T> | null> {
        if (this.sql_model == null) return Promise.resolve(null);
        return await this.sql_model.findOne({
            where: {
                username: username
            }
        });
    }
}