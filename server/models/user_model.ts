import Sequelize from "sequelize";
import { BaseModel } from "./base_model";
import bcrypt from "bcrypt";

type UserModel_T = {
    username: string,
    password_hash: string,
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
            password_hash: {
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

    public static generatePassword(password: string): Promise<string> {
        return bcrypt.hash(password, 10);
    }

    public static validatePassword(password_hash: string, password: string): Promise<boolean> {
        return bcrypt.compare(password, password_hash);
    }
}