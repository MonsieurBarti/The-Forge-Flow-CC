export type Result<T, E> = OkResult<T> | ErrResult<E>;

export interface OkResult<T> {
  readonly ok: true;
  readonly data: T;
}

export interface ErrResult<E> {
  readonly ok: false;
  readonly error: E;
}

export const Ok = <T>(data: T): OkResult<T> => ({ ok: true, data });

export const Err = <E>(error: E): ErrResult<E> => ({ ok: false, error });

export const isOk = <T, E>(result: Result<T, E>): result is OkResult<T> =>
  result.ok === true;

export const isErr = <T, E>(result: Result<T, E>): result is ErrResult<E> =>
  result.ok === false;

export const match = <T, E, R>(
  result: Result<T, E>,
  handlers: { onOk: (data: T) => R; onErr: (error: E) => R },
): R => (result.ok ? handlers.onOk(result.data) : handlers.onErr(result.error));
