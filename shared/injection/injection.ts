export class Kernel {

    private bindings: Map<string, Injectable<any>>;
    private static_bindings: Map<string, Injectable<any>>;
    private static_values: Map<string, IInjectable>;

    constructor() {
        this.bindings = new Map<string, Injectable<any>>();
        this.static_bindings = new Map<string, Injectable<any>>();
        this.static_values = new Map<string, IInjectable>();
    }

    public bind<S>(tpe: string) {
        return (t: Injectable<S>) => {
            this.bindings.set(tpe, t);
        }
    }

    public bindStatic<S>(tpe: string) {
        return (t: Injectable<S>) => {
            this.static_bindings.set(tpe, t);
        }
    }

    public setStatic<S extends IInjectable>(tpe: string) {
        return (t: S) => {
            this.static_values.set(tpe, t);
        }
    }

    public get<T extends IInjectable>(tpe: string): T {
        if (this.bindings.has(tpe)) {
            return new (this.bindings.get(tpe) as Injectable<T>)(this) as T;
        } else if (this.static_values.has(tpe)) {
            return this.static_values.get(tpe) as T;
        } else if (this.static_bindings.has(tpe)) {
            let val = new (this.static_bindings.get(tpe) as Injectable<T>)(this) as T;
            this.static_values.set(tpe, val);
            return val;
        }
        throw new Error("Binding not found");
    }
}

export interface IInjectable {
}

type Injectable<T extends IInjectable> = {
    new(kernel: Kernel): T;
}
