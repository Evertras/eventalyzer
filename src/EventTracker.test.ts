import * as mocha from 'mocha';
import { EventTracker } from '.';
import { expect } from 'chai';

const mockIntervalMs = 100;
const mockTtlMs = 1000;
const expectedBuckets = mockTtlMs / mockIntervalMs;

describe('EventTracker', () => {
	it('does not allow a TTL shorter than the interval', () => {
		expect(() => new EventTracker(100, 10)).to.throw();
	});

	it('tracks an added event', () => {
		const tracker = new EventTracker(mockIntervalMs, mockTtlMs);

		tracker.add();

		expect(tracker.total).to.equal(1);
	});

	it('tracks events over multiple ticks', () => {
		const tracker = new EventTracker(mockIntervalMs, mockTtlMs);

		tracker.add();
		tracker.intervalTick();
		tracker.add();

		expect(tracker.total).to.equal(2);
	});

	it('subtracts events that drop off from TTL', () => {
		const tracker = new EventTracker(mockIntervalMs, mockTtlMs);

		tracker.add();

		for (let i = 0; i < expectedBuckets; i++) {
			expect(tracker.total).to.equal(1);
			tracker.intervalTick();
		}

		expect(tracker.total).to.equal(0);
	});

	it('keeps a running total correctly over multiple intervals', () => {
		const tracker = new EventTracker(mockIntervalMs, mockTtlMs);

		for (let i = 0; i < expectedBuckets * 100; i++) {
			tracker.intervalTick();
			tracker.add();
			expect(tracker.total).to.equal(Math.min(expectedBuckets, i+1));
		}

		expect(tracker.total).to.equal(expectedBuckets);
	});
});

