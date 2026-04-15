import { z } from "zod";
export declare const DependencyTypeSchema: z.ZodLiteral<"blocks">;
export declare const DependencySchema: z.ZodObject<{
    fromId: z.ZodString;
    toId: z.ZodString;
    type: z.ZodLiteral<"blocks">;
}, z.core.$strip>;
export type Dependency = z.infer<typeof DependencySchema>;
//# sourceMappingURL=dependency.d.ts.map