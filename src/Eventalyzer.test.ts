import * as mocha from 'mocha';
import { expect } from 'chai';
import { Eventalyzer } from '.';
import * as sinon from 'sinon';

interface MockEvent {
	user: string;
}

const mockIntervalMs = 100;
const mockTtlMs = 1000;
const mockCleanupMs = mockTtlMs * 10;
const mockOpts = { intervalMs: mockIntervalMs, ttlMs: mockTtlMs, cleanupMs: mockCleanupMs };
const clock = sinon.useFakeTimers();
const mockUserA = 'someone';
const mockUserB = 'another';

describe('Eventalyzer', () => {
	it('tracks an event', () => {
		const eventalyzer = new Eventalyzer<MockEvent, string>(mockOpts, (m: MockEvent) => m.user);

		eventalyzer.addEvent({ user: mockUserA });

		let foundUser = false;

		eventalyzer.checkThreshold(1, (user: string, count: number) => {
			expect(user).to.equal(mockUserA);
			expect(count).to.equal(1);
			foundUser = true;
		});

		expect(foundUser).to.be.true;
	});

	it('tracks across different hashes', () => {
		const eventalyzer = new Eventalyzer<MockEvent, string>(mockOpts, (m: MockEvent) => m.user);

		const expectedCountUserA = 7;
		const expectedCountUserB = 100;

		for (let i = 0; i < expectedCountUserA; i++) {
			eventalyzer.addEvent({ user: mockUserA });
		}

		for (let i = 0; i < expectedCountUserB; i++) {
			eventalyzer.addEvent({ user: mockUserB });
		}

		expect(eventalyzer.currentlyTracking).to.equal(2);

		let foundUser = new Map<string, boolean>();

		eventalyzer.checkThreshold(1, (user: string, count: number) => {
			if (user === mockUserA) {
				expect(count).to.equal(expectedCountUserA);
			} else if (user === mockUserB) {
				expect(count).to.equal(expectedCountUserB);
			} else {
				throw new Error('Unknown user returned: ' + user);
			}

			foundUser.set(user, true);
		});

		expect(foundUser.has(mockUserA)).to.be.true;
		expect(foundUser.has(mockUserB)).to.be.true;
	});

	it('lets old events slide off', () => {
		const eventalyzer = new Eventalyzer<MockEvent, string>(mockOpts, (m: MockEvent) => m.user);

		eventalyzer.start();

		const initialFlood = 10000;

		for (let i = 0; i < initialFlood; i++) {
			eventalyzer.addEvent({user: mockUserA});
		}

		let foundUser = false;

		eventalyzer.checkThreshold(initialFlood, (hash: string, count: number) => {
			foundUser = true;
		})

		expect(foundUser).to.equal(true, 'should have found initial flood of events');

		for (let i = 0; i < 1000; i++) {
			clock.tick(mockIntervalMs);
			eventalyzer.addEvent({user: mockUserA});
		}

		foundUser = false;

		eventalyzer.checkThreshold(initialFlood, (hash: string, count: number) => {
			foundUser = true;
		})

		expect(foundUser).to.equal(false, 'should not have triggered off initial flood threshold');

		eventalyzer.stop();
	});

	it('removes any existing trackers sitting at 0', () => {
		const eventalyzer = new Eventalyzer<MockEvent, string>(mockOpts, (m: MockEvent) => m.user);

		eventalyzer.addEvent({ user: mockUserA });
		eventalyzer.addEvent({ user: mockUserB });

		expect(eventalyzer.currentlyTracking).to.equal(2, 'Should start tracking both users');

		eventalyzer.start();

		expect(eventalyzer.currentlyTracking).to.equal(2, 'Should still be tracking both users after starting');

		clock.tick(mockIntervalMs);

		expect(eventalyzer.currentlyTracking).to.equal(2, 'Should still be tracking both users after an interval tick');

		for (let i = 0; i < mockTtlMs / mockIntervalMs; i++) {
			eventalyzer.addEvent({ user: mockUserA});
			clock.tick(mockIntervalMs);
		}

		expect(eventalyzer.currentlyTracking).to.equal(2, 'Should not have cleaned up mockUserB due to inactivity yet');

		eventalyzer.addEvent({ user: mockUserB });

		for (let i = 0; i < mockCleanupMs / mockIntervalMs; i++) {
			eventalyzer.addEvent({ user: mockUserA});
			clock.tick(mockIntervalMs);
		}

		expect(eventalyzer.currentlyTracking).to.equal(1, 'Should have cleaned up mockUserB due to inactivity by now');

		let foundUser = false;

		eventalyzer.checkThreshold(1, (user: string, count: number) => {
			if (user === mockUserA) {
				foundUser = true;
			}
		});

		expect(foundUser).to.equal(true, 'did not find user A after many ticks');

		eventalyzer.stop();
	});
});

