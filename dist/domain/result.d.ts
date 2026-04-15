export type Result<T, E> = OkResult<T> | ErrResult<E>;
export interface OkResult<T> {
    readonly ok: true;
    readonly data: T;
}
export interface ErrResult<E> {
    readonly ok: false;
    readonly error: E;
}
export declare const Ok: <T>(data: T) => OkResult<T>;
export declare const Err: <E>(error: E) => ErrResult<E>;
export declare const isOk: <T, E>(result: Result<T, E>) => result is OkResult<T>;
export declare const isErr: <T, E>(result: Result<T, E>) => result is ErrResult<E>;
export declare const match: <T, E, R>(result: Result<T, E>, handlers: {
    onOk: (data: T) => R;
    onErr: (error: E) => R;
}) => R;
//# sourceMappingURL=result.d.ts.map