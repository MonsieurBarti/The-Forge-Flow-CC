export declare const taskCompletedEvent: (taskId: string, sliceId: string, executor: string) => {
    id: string;
    type: "SLICE_PLANNED" | "SLICE_STATUS_CHANGED" | "TASK_COMPLETED";
    occurredAt: Date;
    payload: Record<string, unknown>;
};
//# sourceMappingURL=task-completed.event.d.ts.map