import { z } from "zod";

export const MilestoneStatusSchema = z.enum(["open", "in_progress", "closed"]);
export type MilestoneStatus = z.infer<typeof MilestoneStatusSchema>;
