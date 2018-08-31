export type Result<S, F> =
	{ kind: "OK", val: S } |
	{ kind: "ERR", val: F };

export function OK<S, F>(s: S): Result<S, F> {
	return { kind: "OK", val: s };
}

export function ERR<S, F>(f: F): Result<S, F> {
	return { kind: "ERR", val: f };
}
