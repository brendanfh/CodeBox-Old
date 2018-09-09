import path from "path";
import Sequelize, { SequelizeLoDash } from "sequelize";
import { BaseModel } from "./models/base_model";

//If true, forces all tables to be dropped and recreated on reconnect
let FORCE_UPDATE: boolean = false;

export class Database {
    protected models: Map<string, BaseModel<any>>;

    protected sqlz: Sequelize.Sequelize | null = null;

    constructor() {
        this.models = new Map<string, BaseModel<any>>();
    }

    public async initConnection(): Promise<void> {
        if (process.env.ROOT_DIR == undefined) throw new Error("ROOT_DIR NOT SET");

        const sqlz = new Sequelize(`sqlite:${path.join(process.env.ROOT_DIR, "/ccdb.sqlite")}`);

        try {
            await sqlz.authenticate();
            this.sqlz = sqlz;
        } catch (err) {
            throw new Error("DB CONNECTION ERROR: " + err);
        }
    }

    public addModel(mdl: BaseModel<any>): void {
        this.models.set(mdl.name, mdl);
    }

    public getModel<T extends BaseModel<any>>(name: string): T {
        return (this.models.get(name)) as T;
    }

    public async setupModels(): Promise<void> {
        let proms = [];

        for (let model of this.models) {
            let updateFunc = async () => {
                if (this.sqlz == null) throw new Error("DB NOT CONNECTED");

                await model[1].define(this.sqlz, FORCE_UPDATE);
            }

            proms.push(updateFunc());
        }

        await Promise.all(proms);
    }
}