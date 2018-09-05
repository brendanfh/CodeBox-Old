export type Result<S, F> =
	{ kind: "OK", val: S } |
	{ kind: "ERR", val: F };

export function OK<S, F>(s: S): Result<S, F> {
	return { kind: "OK", val: s };
}

export function ERR<S, F>(f: F): Result<S, F> {
	return { kind: "ERR", val: f };
}

export type Maybe<T> =
	{ kind: "JUST", val: T } |
	{ kind: "NONE" };

export function JUST<T>(t: T): Maybe<T> {
	return { kind: "JUST", val: t };
}

export function NONE<T>(): Maybe<T> {
	return { kind: "NONE" };
}

export function isJust(mt: Maybe<any>): boolean {
	return (mt.kind == "JUST");
}

export function isNone(mt: Maybe<any>): boolean {
	return (mt.kind == "NONE");
}
