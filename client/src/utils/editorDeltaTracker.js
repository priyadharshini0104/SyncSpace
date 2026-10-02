// Code Editor Revision Scrubber and Delta Tracker (Member 4)
export class EditorDeltaTracker {
  constructor() {
    this.revisions = [];
    this.activeRevisionIndex = -1;
  }

  trackChange(codeContent, author = 'anonymous') {
    const revisionEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      author,
      content: codeContent,
      length: codeContent ? codeContent.length : 0
    };

    if (this.activeRevisionIndex < this.revisions.length - 1) {
      this.revisions = this.revisions.slice(0, this.activeRevisionIndex + 1);
    }

    this.revisions.push(revisionEntry);
    this.activeRevisionIndex = this.revisions.length - 1;
    return revisionEntry;
  }

  seekRevision(index) {
    if (index >= 0 && index < this.revisions.length) {
      this.activeRevisionIndex = index;
      return this.revisions[index];
    }
    return null;
  }

  getRevisionHistory() {
    return this.revisions;
  }

  getRevisionCount() {
    return this.revisions.length;
  }
}

export const editorDeltaTracker = new EditorDeltaTracker();