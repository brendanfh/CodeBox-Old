import sequelize from "sequelize";

export abstract class BaseModel<T> {
    protected sql_model: sequelize.Model<sequelize.Instance<T> & T, T> | null = null;
    protected force_sync: boolean;

    private __name: string;
    public get name(): string { return this.__name };

    constructor(name: string) {
        this.__name = name;
        this.force_sync = false;
    }

    protected abstract getModelAttributes(): sequelize.DefineModelAttributes<T>;

    public async define(sequelize: sequelize.Sequelize): Promise<void> {
        this.sql_model = sequelize.define(this.name, this.getModelAttributes());
        await this.sql_model.sync({ force: this.force_sync });
    }

    public async create(t: T) {
        if (this.sql_model == null) return Promise.resolve(null);

        return await this.sql_model.create(t);
    }

    public async findAll(): Promise<T[] | null> {
        if (this.sql_model == null) return Promise.resolve(null);
        return await this.sql_model.findAll();
    }
}