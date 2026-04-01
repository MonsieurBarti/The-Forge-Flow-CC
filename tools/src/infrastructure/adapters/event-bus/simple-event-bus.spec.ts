import { describe, expect, it, vi } from 'vitest';
import { createDomainEvent } from '../../../domain/events/domain-event.js';
import { SimpleEventBus } from './simple-event-bus.js';

describe('SimpleEventBus', () => {
  it('delivers event to subscriber', () => {
    const bus = new SimpleEventBus();
    const handler = vi.fn();
    bus.subscribe('SLICE_STATUS_CHANGED', handler);
    const event = createDomainEvent('SLICE_STATUS_CHANGED', { sliceId: 'M01-S04', from: 'planning', to: 'executing' });
    bus.publish(event);
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('delivers to multiple subscribers for same event', () => {
    const bus = new SimpleEventBus();
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.subscribe('TASK_COMPLETED', h1);
    bus.subscribe('TASK_COMPLETED', h2);
    const event = createDomainEvent('TASK_COMPLETED', { taskId: 'T01', sliceId: 'M01-S04', executor: 'opus' });
    bus.publish(event);
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('does not deliver to unsubscribed event types', () => {
    const bus = new SimpleEventBus();
    const handler = vi.fn();
    bus.subscribe('TASK_COMPLETED', handler);
    const event = createDomainEvent('SLICE_STATUS_CHANGED', { sliceId: 'M01-S04', from: 'a', to: 'b' });
    bus.publish(event);
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not throw when publishing with no subscribers', () => {
    const bus = new SimpleEventBus();
    const event = createDomainEvent('SYNC_CONFLICT', { entityId: 'x', field: 'y', winner: 'markdown' });
    expect(() => bus.publish(event)).not.toThrow();
  });
});
