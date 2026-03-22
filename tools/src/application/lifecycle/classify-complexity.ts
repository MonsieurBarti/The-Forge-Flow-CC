import { type ComplexityTier } from '../../domain/value-objects/complexity-tier.js';

interface ComplexitySignals {
  taskCount: number;
  estimatedFilesAffected: number;
  newFilesCreated: number;
  modulesAffected: number;
  hasExternalIntegrations: boolean;
  requiresInvestigation: boolean;
  architectureImpact: boolean;
  unknownsSurfaced: number;
}

export const classifyComplexity = (signals: ComplexitySignals): ComplexityTier => {
  // F-full: external integrations, large scope, or many modules
  if (signals.hasExternalIntegrations) return 'F-full';
  if (signals.taskCount >= 8 || signals.modulesAffected >= 4) return 'F-full';

  // S-tier: ALL of these must be true — single-file, no new files, known root cause
  const isS =
    signals.estimatedFilesAffected <= 1 &&
    signals.newFilesCreated === 0 &&
    !signals.requiresInvestigation &&
    !signals.architectureImpact &&
    signals.unknownsSurfaced === 0;

  if (isS) return 'S';

  // Default: F-lite (everything that isn't clearly S or F-full)
  return 'F-lite';
};
