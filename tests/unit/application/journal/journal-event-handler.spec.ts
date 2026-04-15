import { describe, expect, it } from 'vitest';
import { createDomainEvent } from '../../src/../src/domain/events/domain-event.js';
import { isOk } from '../../src/../src/domain/result.js';
import { SimpleEventBus } from '../../src/../src/infrastructure/adapters/event-bus/simple-event-bus.js';
import { InMemoryJournalAdapter } from '../../src/../src/infrastructure/testing/in-memory-journal.adapter.js';
import { JournalEventHandler } from '../../../src/application/journal/journal-event-handler.js';

describe('JournalEventHandler', () => {
  it('writes phase-changed entry on SLICE_STATUS_CHANGED', () => {
    const journal = new InMemoryJournalAdapter();
    const bus = new SimpleEventBus();
    const handler = new JournalEventHandler(journal);
    handler.register(bus);

    const event = createDomainEvent('SLICE_STATUS_CHANGED', { sliceId: 'M01-S04', from: 'planning', to: 'executing' });
    bus.publish(event);

    const result = journal.readAll('M01-S04');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('phase-changed');
      if (result.data[0].type === 'phase-changed') {
        expect(result.data[0].from).toBe('planning');
        expect(result.data[0].to).toBe('executing');
      }
    }
  });

  it('ignores events it is not subscribed to', () => {
    const journal = new InMemoryJournalAdapter();
    const bus = new SimpleEventBus();
    const handler = new JournalEventHandler(journal);
    handler.register(bus);

    const event = createDomainEvent('TASK_COMPLETED', { taskId: 'T99', sliceId: 'x', executor: 'test' });
    bus.publish(event);

    // Should not write anything — TASK_COMPLETED is not subscribed
    const result = journal.count('x');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) expect(result.data).toBe(0);
  });
});
