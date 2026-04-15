export function tffWarn(message, context) {
    if (context !== undefined) {
        console.warn("[tff]", message, context);
    }
    else {
        console.warn("[tff]", message);
    }
}
//# sourceMappingURL=warn.js.map