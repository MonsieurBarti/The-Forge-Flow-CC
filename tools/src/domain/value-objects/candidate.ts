import { z } from 'zod';

export const CandidateEvidenceSchema = z.object({
  count: z.number().int().min(1),
  sessions: z.number().int().min(1),
  projects: z.number().int().min(1),
});

export const CandidateSchema = z.object({
  pattern: z.array(z.string()).min(1),
  score: z.number().min(0).max(1),
  evidence: CandidateEvidenceSchema,
});

export type Candidate = z.infer<typeof CandidateSchema>;
export type CandidateEvidence = z.infer<typeof CandidateEvidenceSchema>;
