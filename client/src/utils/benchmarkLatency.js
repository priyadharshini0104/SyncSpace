// Performance and Latency Benchmark Engine (Member 5)
export class BenchmarkLatency {
  constructor() {
    this.metrics = [];
  }

  startMetric(label) {
    return {
      label,
      startTime: performance.now()
    };
  }

  endMetric(tracker) {
    const duration = performance.now() - tracker.startTime;
    const entry = {
      label: tracker.label,
      durationMs: parseFloat(duration.toFixed(2)),
      timestamp: new Date().toISOString()
    };
    this.metrics.push(entry);
    return entry;
  }

  getSummary() {
    if (this.metrics.length === 0) return { avgMs: 0, totalPings: 0 };
    const total = this.metrics.reduce((acc, m) => acc + m.durationMs, 0);
    return {
      totalPings: this.metrics.length,
      avgMs: parseFloat((total / this.metrics.length).toFixed(2)),
      metrics: this.metrics
    };
  }

  clearMetrics() {
    this.metrics = [];
  }
}

export const benchmarkLatency = new BenchmarkLatency();