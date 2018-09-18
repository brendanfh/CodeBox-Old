import Sequelize from "sequelize";
import { BaseModel } from "./base_model";
import { UserModel } from "./user_model";
import { Database } from "../database";
import * as shared_types from "../../shared/types";

export interface JobModel_T extends shared_types.Job {
    status_str: string
}

export class JobModel extends BaseModel<JobModel_T> {

    public constructor() {
        super();
        
        this.force_sync = true;
    }

    public static MODEL_NAME: string = "Job";
    public getName() {
        return JobModel.MODEL_NAME;
    }

    protected getModelAttributes(): Sequelize.DefineModelAttributes<JobModel_T> {
        return {
            username: {
                type: Sequelize.STRING,
                allowNull: false
            },
            problem: {
                type: Sequelize.STRING,
                allowNull: false
            },
            id: {
                type: Sequelize.UUIDV4,
                allowNull: false,
                unique: true,
                primaryKey: true,
                field: 'job_id'
            },
            status: {
                type: Sequelize.JSON,
                allowNull: false
            },
            status_str:{
                type: Sequelize.STRING,
                allowNull: false
            },
            lang: {
                type: Sequelize.STRING,
                allowNull: false
            },
            code: {
                type: Sequelize.TEXT({ length: "medium" })
            },
            time_initiated: {
                type: Sequelize.INTEGER
            }
        }
    }
}