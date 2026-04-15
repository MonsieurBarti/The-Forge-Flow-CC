export class JournalEntryBuilder {
    _sliceId = crypto.randomUUID();
    _timestamp = new Date().toISOString();
    _correlationId = undefined;
    withSliceId(id) {
        this._sliceId = id;
        return this;
    }
    withTimestamp(ts) {
        this._timestamp = ts;
        return this;
    }
    withCorrelationId(id) {
        this._correlationId = id;
        return this;
    }
    buildTaskStarted(overrides) {
        return {
            type: "task-started",
            sliceId: this._sliceId,
            timestamp: this._timestamp,
            correlationId: this._correlationId,
            taskId: overrides?.taskId ?? crypto.randomUUID(),
            waveIndex: overrides?.waveIndex ?? 0,
            agentIdentity: overrides?.agentIdentity ?? "opus",
        };
    }
    buildTaskCompleted(overrides) {
        return {
            type: "task-completed",
            sliceId: this._sliceId,
            timestamp: this._timestamp,
            correlationId: this._correlationId,
            taskId: overrides?.taskId ?? crypto.randomUUID(),
            waveIndex: overrides?.waveIndex ?? 0,
            durationMs: overrides?.durationMs ?? 1000,
            commitHash: overrides?.commitHash,
        };
    }
    buildTaskFailed(overrides) {
        return {
            type: "task-failed",
            sliceId: this._sliceId,
            timestamp: this._timestamp,
            correlationId: this._correlationId,
            taskId: overrides?.taskId ?? crypto.randomUUID(),
            waveIndex: overrides?.waveIndex ?? 0,
            errorCode: overrides?.errorCode ?? "AGENT.FAILURE",
            errorMessage: overrides?.errorMessage ?? "Task failed",
            retryable: overrides?.retryable ?? true,
        };
    }
    buildFileWritten(overrides) {
        return {
            type: "file-written",
            sliceId: this._sliceId,
            timestamp: this._timestamp,
            correlationId: this._correlationId,
            taskId: overrides?.taskId ?? crypto.randomUUID(),
            filePath: overrides?.filePath ?? "src/test-file.ts",
            operation: overrides?.operation ?? "created",
        };
    }
    buildCheckpointSaved(overrides) {
        return {
            type: "checkpoint-saved",
            sliceId: this._sliceId,
            timestamp: this._timestamp,
            correlationId: this._correlationId,
            waveIndex: overrides?.waveIndex ?? 0,
            completedTaskCount: overrides?.completedTaskCount ?? 0,
        };
    }
    buildPhaseChanged(overrides) {
        return {
            type: "phase-changed",
            sliceId: this._sliceId,
            timestamp: this._timestamp,
            correlationId: this._correlationId,
            from: overrides?.from ?? "planning",
            to: overrides?.to ?? "executing",
        };
    }
    buildArtifactWritten(overrides) {
        return {
            type: "artifact-written",
            sliceId: this._sliceId,
            timestamp: this._timestamp,
            correlationId: this._correlationId,
            artifactPath: overrides?.artifactPath ?? ".tff/milestones/M01/slices/M01-S04/SPEC.md",
            artifactType: overrides?.artifactType ?? "spec",
        };
    }
    buildGuardrailViolation(overrides) {
        return {
            type: "guardrail-violation",
            sliceId: this._sliceId,
            timestamp: this._timestamp,
            correlationId: this._correlationId,
            taskId: overrides?.taskId ?? crypto.randomUUID(),
            waveIndex: overrides?.waveIndex ?? 0,
            violations: [
                {
                    ruleId: "NO_SECRETS",
                    message: "Secret detected",
                    severity: "error",
                },
            ],
            action: overrides?.action ?? "blocked",
        };
    }
    buildOverseerIntervention(overrides) {
        return {
            type: "overseer-intervention",
            sliceId: this._sliceId,
            timestamp: this._timestamp,
            correlationId: this._correlationId,
            taskId: overrides?.taskId ?? crypto.randomUUID(),
            strategy: overrides?.strategy ?? "timeout",
            reason: overrides?.reason ?? "Timed out",
            action: overrides?.action ?? "aborted",
            retryCount: overrides?.retryCount ?? 0,
        };
    }
    buildExecutionLifecycle(overrides) {
        return {
            type: "execution-lifecycle",
            sliceId: this._sliceId,
            timestamp: this._timestamp,
            correlationId: this._correlationId,
            sessionId: overrides?.sessionId ?? crypto.randomUUID(),
            action: overrides?.action ?? "started",
            resumeCount: overrides?.resumeCount ?? 0,
            failureReason: overrides?.failureReason,
        };
    }
}
//# sourceMappingURL=journal-entry.builder.js.map