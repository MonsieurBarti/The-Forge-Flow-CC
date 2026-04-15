export const Ok = (data) => ({ ok: true, data });
export const Err = (error) => ({ ok: false, error });
export const isOk = (result) => result.ok === true;
export const isErr = (result) => result.ok === false;
export const match = (result, handlers) => (result.ok ? handlers.onOk(result.data) : handlers.onErr(result.error));
//# sourceMappingURL=result.js.map