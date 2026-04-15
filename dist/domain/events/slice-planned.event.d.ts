export declare const slicePlannedEvent: (sliceId: string, taskCount: number) => {
    id: string;
    type: "SLICE_PLANNED" | "SLICE_STATUS_CHANGED" | "TASK_COMPLETED";
    occurredAt: Date;
    payload: Record<string, unknown>;
};
//# sourceMappingURL=slice-planned.event.d.ts.map