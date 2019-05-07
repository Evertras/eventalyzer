import { EventTracker } from './EventTracker';

export type HashFunc<T, K> = (x: T) => K;

export interface EventalyzerOptions {
	intervalMs: number;
	ttlMs: number;
	cleanupMs: number | undefined;
}

export class Eventalyzer<EventType, HashKey> {
	private readonly intervalMs: number;
	private readonly ttlMs: number;
	private readonly cleanupMs: number;
	private readonly hashFn: HashFunc<EventType, HashKey>;
	private readonly trackers: Map<HashKey, EventTracker> = new Map<HashKey, EventTracker>();
	private intervalHandle: number | null = null;

	public constructor(opts: EventalyzerOptions, hashFn: HashFunc<EventType, HashKey>) {
		if (opts.intervalMs > opts.ttlMs) {
			throw new Error('ttlMs must be greater than intervalMs');
		}

		this.hashFn = hashFn;
		this.intervalMs = opts.intervalMs;
		this.ttlMs = opts.ttlMs;
		this.cleanupMs = opts.cleanupMs || opts.ttlMs;
	}

	public start() {
		if (this.intervalHandle) {
			this.stop();
		}

		this.intervalHandle = setInterval(() => {
			const toDelete: HashKey[] = [];

			this.trackers.forEach((v: EventTracker, k: HashKey) => {
				v.intervalTick();

				if (v.timeSinceEmptyMs >= this.cleanupMs) {
					toDelete.push(k);
				}
			});

			for (let k of toDelete) {
				this.trackers.delete(k);
			}
		}, this.intervalMs);
	}

	public stop() {
		if (this.intervalHandle) {
			clearInterval(this.intervalHandle);
			this.intervalHandle = null;
		}
	}

	public addEvent(e: EventType) {
		const key = this.hashFn(e);

		let tracker = this.trackers.get(key);

		if (!tracker) {
			tracker = new EventTracker(this.intervalMs, this.ttlMs);
			this.trackers.set(key, tracker);
		} 

		tracker.add();
	}

	public checkThreshold(threshold: number, cb: (hash: HashKey, count: number) => void) {
		this.trackers.forEach((v: EventTracker, k: HashKey) => {
			if (v.total >= threshold) {
				cb(k, v.total);
			}
		});
	}

	public get currentlyTracking(): number {
		return this.trackers.size;
	}
}

