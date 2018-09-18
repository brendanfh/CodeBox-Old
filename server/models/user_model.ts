import Sequelize from "sequelize";
import { BaseModel } from "./base_model";
import bcrypt from "bcrypt";

type UserModel_T = {
    username: string,
    password_hash: string,
    email: string,
    nickname: string,
}

export class UserModel extends BaseModel<UserModel_T> {

    constructor() {
        super();
    }

    public static MODEL_NAME: string = "User";
    public getName() {
        return UserModel.MODEL_NAME;
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
            nickname: {
                type: Sequelize.STRING
            },
            email: {
                type: Sequelize.STRING,
                unique: true,
                allowNull: false,
            }
        }
    }

    public async createWithValues(username: string, password: string, email: string, nickname: string) {
        return await this.create({
            username,
            password_hash: await UserModel.generatePassword(password),
            email,
            nickname
        });
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

    public async updateInfoByUsername(username: string, email: string, nickname: string): Promise<boolean> {
        if (this.sql_model == null) return false;

        let [num] = await this.sql_model.update({
            email,
            nickname
        }, {
            where: { username }
        });

        return num > 0;
    }

    public async updatePasswordByUsername(username: string, new_password: string): Promise<void> {
        if (this.sql_model == null) return;

        await this.sql_model.update({
            password_hash: await UserModel.generatePassword(new_password)
        }, {
            where: { username }
        });
    }

    public async validateUser(username: string, password: string): Promise<boolean> {
        if (this.sql_model == null) return false;

        let user = await this.sql_model.find({ where: { username }});
        if (user == null) return false;

        return UserModel.validatePassword(user.getDataValue("password_hash"), password);
    }

    public static generatePassword(password: string): Promise<string> {
        return bcrypt.hash(password, 10);
    }

    public static validatePassword(password_hash: string, password: string): Promise<boolean> {
        return bcrypt.compare(password, password_hash);
    }
}