import sequelize from "sequelize";

export abstract class BaseModel<T> {
    protected sql_model: sequelize.Model<sequelize.Instance<T> & T, T> | null = null;

    public getSqlModel(): sequelize.Model<sequelize.Instance<T> & T, T> | null {
        return this.sql_model;
    }

    protected force_sync: boolean;

    constructor() {
        this.force_sync = false;
    }

    public abstract getName(): string;
    protected abstract getModelAttributes(): sequelize.DefineModelAttributes<T>;

    public async define(sequelize: sequelize.Sequelize): Promise<void> {
        this.sql_model = sequelize.define(this.getName(), this.getModelAttributes());
        await this.sql_model.sync({ force: this.force_sync });
    }

    public async create(t: T): Promise<(sequelize.Instance<T> & T) | null> {
        if (this.sql_model == null) return Promise.resolve(null);

        return await this.sql_model.create(t);
    }

    public async findAll(): Promise<T[] | null> {
        if (this.sql_model == null) return Promise.resolve(null);
        return await this.sql_model.findAll();
    }
}