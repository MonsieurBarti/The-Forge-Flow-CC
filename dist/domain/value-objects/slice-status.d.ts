import { z } from "zod";
export declare const SliceStatusSchema: z.ZodEnum<{
    closed: "closed";
    discussing: "discussing";
    researching: "researching";
    planning: "planning";
    executing: "executing";
    verifying: "verifying";
    reviewing: "reviewing";
    completing: "completing";
}>;
export type SliceStatus = z.infer<typeof SliceStatusSchema>;
export declare const canTransition: (from: SliceStatus, to: SliceStatus) => boolean;
export declare const validTransitionsFrom: (status: SliceStatus) => readonly SliceStatus[];
//# sourceMappingURL=slice-status.d.ts.map