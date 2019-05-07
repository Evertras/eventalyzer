import * as mocha from 'mocha';
import { EventTracker } from './EventTracker';
import { expect } from 'chai';
import * as sinon from 'sinon';

const mockIntervalMs = 100;
const mockTtlMs = 1000;
const expectedBuckets = mockTtlMs / mockIntervalMs;
let clock: sinon.SinonFakeTimers;

describe('EventTracker', () => {
	beforeEach(() => {
		clock = sinon.useFakeTimers();
	});

	afterEach(() => {
		clock.restore();
	});

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

	it('knows how long it\'s been empty for when no events come in', () => {
		const tracker = new EventTracker(mockIntervalMs, mockTtlMs);

		for (let i = 0; i < 10; i++) {
			tracker.intervalTick();
		}

		expect(tracker.timeSinceEmptyMs).to.equal(10 * mockIntervalMs);
	});

	it('does not think it\'s empty when events are coming in', () => {
		const tracker = new EventTracker(mockIntervalMs, mockTtlMs);
		tracker.intervalTick();
		expect(tracker.timeSinceEmptyMs).to.equal(mockIntervalMs, 'Initial tick should have been empty');

		for (let i = 0; i < 10; i++) {
			tracker.add();
			tracker.intervalTick();
			expect(tracker.timeSinceEmptyMs).to.equal(0, 'Subsequent ticks should not be empty');
		}
	});
});

