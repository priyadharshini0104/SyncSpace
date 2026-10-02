// Canvas Snapshot Rewind Engine for Week 4
export class SnapshotEngine {
  constructor() {
    this.history = [];
    this.currentIndex = -1;
  }

  recordSnapshot(canvasState) {
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }
    this.history.push(JSON.stringify(canvasState));
    this.currentIndex = this.history.length - 1;
  }

  getSnapshotAt(index) {
    if (index >= 0 && index < this.history.length) {
      this.currentIndex = index;
      return JSON.parse(this.history[index]);
    }
    return null;
  }

  getTotalSnapshots() {
    return this.history.length;
  }

  clearHistory() {
    this.history = [];
    this.currentIndex = -1;
  }
}

export const snapshotEngine = new SnapshotEngine();