export declare const sliceStatusChangedEvent: (sliceId: string, from: string, to: string) => {
    id: string;
    type: "SLICE_PLANNED" | "SLICE_STATUS_CHANGED" | "TASK_COMPLETED";
    occurredAt: Date;
    payload: Record<string, unknown>;
};
//# sourceMappingURL=slice-status-changed.event.d.ts.map