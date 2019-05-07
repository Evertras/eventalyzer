export class EventTracker {
	private ttlMs: number;
	private buckets: number[] = [];
	private bucketMax: number;
	private runningTotal: number = 0;

	public constructor(intervalMs: number, ttlMs: number) {
		if (intervalMs > ttlMs) {
			throw new Error('ttlMs must be greater than intervalMs');
		}

		this.ttlMs = ttlMs;
		this.bucketMax = Math.ceil(ttlMs / intervalMs);

		for (let i = 0; i < this.bucketMax; i++) {
			this.buckets.push(0);
		}
	}

	public add(): void {
		this.buckets[this.buckets.length-1]++;

		this.runningTotal++;
	}

	public intervalTick(): void {
		const dropped = this.buckets.splice(0, 1);
		this.buckets.push(0);

		this.runningTotal -= dropped[0];
	}

	public get total(): number {
		return this.runningTotal;
	}
}
