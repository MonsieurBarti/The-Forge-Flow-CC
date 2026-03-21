import { type ComplexityTier } from '../../domain/value-objects/complexity-tier.js';

interface ComplexitySignals {
  taskCount: number;
  estimatedFilesAffected: number;
  modulesAffected: number;
  hasExternalIntegrations: boolean;
  unknownsSurfaced: number;
}

export const classifyComplexity = (signals: ComplexitySignals): ComplexityTier => {
  if (signals.hasExternalIntegrations) return 'F-full';
  if (signals.taskCount >= 8 || signals.modulesAffected >= 4) return 'F-full';
  if (signals.taskCount >= 4 || signals.modulesAffected >= 2 || signals.estimatedFilesAffected >= 6 || signals.unknownsSurfaced >= 2) return 'F-lite';
  return 'S';
};
