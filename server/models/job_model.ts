import Sequelize from "sequelize";
import { BaseModel } from "./base_model";
import * as shared_types from "../../shared/types";

export interface JobModel_T extends shared_types.Job {
    status_str: shared_types.JobStatusStrs
};

export class JobModel extends BaseModel<JobModel_T> {

    public constructor() {
        super();

        this.force_sync = false;
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
            status_str: {
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

    public async update(job_id: string, new_data: Partial<JobModel_T>) {
        if (this.sql_model == null) return;

        this.sql_model.update(new_data, { where: { id: job_id } });
    }

    public async findById(job_id: string): Promise<JobModel_T | null> {
        if (this.sql_model == null) return null;

        return this.sql_model.find({
            where: { id: job_id }
        });
    }

    public async findByUsername(username: string): Promise<JobModel_T[]> {
        if (this.sql_model == null) return [];

        return this.sql_model.findAll({
            where: { username: username }
        });
    }

    public async findByProblem(problem: string): Promise<JobModel_T[]> {
        if (this.sql_model == null) return [];

        return this.sql_model.findAll({
            where: { problem: problem }
        });
    }

    public async findByUsernameAndProblem(username: string, problem: string): Promise<JobModel_T[]> {
        if (this.sql_model == null) return [];

        return this.sql_model.findAll({
            where: { username: username, problem: problem }
        });
    }

    public async findByUsernameAndStatus(username: string, status: shared_types.JobStatusStrs): Promise<JobModel_T[]> {
        if (this.sql_model == null) return [];

        return this.sql_model.findAll({
            where: { username: username, status_str: status }
        });
    }

    public async findByUsernameAndStatuses(username: string, status: shared_types.JobStatusStrs[]): Promise<JobModel_T[]> {
        if (this.sql_model == null) return [];

        return this.sql_model.findAll({
            where: {
                username: username,
                status_str: {
                    [Sequelize.Op.or]: status
                }
            }
        });
    }

    public async findByProblemAndStatus(problem: string, status: shared_types.JobStatusStrs): Promise<JobModel_T[]> {
        if (this.sql_model == null) return [];

        return this.sql_model.findAll({
            where: { problem: problem, status_str: status }
        });
    }

    public async findByAll(username: string, problem: string, statuses: shared_types.JobStatusStrs[], options?: Sequelize.FindOptions<JobModel_T>): Promise<JobModel_T[]> {
        if (this.sql_model == null) return [];

        return this.sql_model.findAll({
            ...options,
            where: {
                username: username, problem: problem,
                status_str: {
                    [Sequelize.Op.or]: statuses
                }
            },
        });
    }
}