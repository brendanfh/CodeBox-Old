import path from "path";
import Sequelize, { SequelizeLoDash } from "sequelize";
import { BaseModel } from "./models/base_model";
import { IInjectable, Kernel } from "../shared/injection/injection";

export interface IBaseModel<R, T extends BaseModel<R>> {
    MODEL_NAME: string;
    new(): T;
}

export class Database implements IInjectable {
    protected models: Map<string, BaseModel<any>>;

    protected sqlz: Sequelize.Sequelize | null = null;

    constructor() {
        this.models = new Map<string, BaseModel<any>>();
    }

    public async initConnection(): Promise<void> {
        if (process.env.ROOT_DIR == undefined) throw new Error("ROOT_DIR NOT SET");

        const sqlz = new Sequelize(`sqlite:${path.join(process.env.ROOT_DIR, "/cbdb.sqlite")}`, {
            logging: false
        });

        try {
            await sqlz.authenticate();
            this.sqlz = sqlz;
        } catch (err) {
            throw new Error("DB CONNECTION ERROR: " + err);
        }
    }

    public addModel(mdl: IBaseModel<any, any>): void {
        this.models.set(mdl.MODEL_NAME, new mdl());
    }

    public getModel<R, T extends BaseModel<R>>(mdl: IBaseModel<R, T>): T {
        return (this.models.get(mdl.MODEL_NAME)) as T;
    }

    public async setupModels(): Promise<void> {
        let proms = [];

        for (let model of this.models) {
            let updateFunc = async () => {
                if (this.sqlz == null) throw new Error("DB NOT CONNECTED");

                await model[1].define(this, this.sqlz);
            }

            proms.push(updateFunc());
        }

        await Promise.all(proms);
    }
}