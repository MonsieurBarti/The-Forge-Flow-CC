import { z } from "zod";
export const SliceStatusSchema = z.enum([
    "discussing",
    "researching",
    "planning",
    "executing",
    "verifying",
    "reviewing",
    "completing",
    "closed",
]);
const transitions = {
    discussing: ["researching"],
    researching: ["planning"],
    planning: ["planning", "executing"],
    executing: ["verifying"],
    verifying: ["reviewing", "executing"],
    reviewing: ["completing", "executing"],
    completing: ["closed"],
    closed: [],
};
export const canTransition = (from, to) => transitions[from].includes(to);
export const validTransitionsFrom = (status) => transitions[status];
//# sourceMappingURL=slice-status.js.map