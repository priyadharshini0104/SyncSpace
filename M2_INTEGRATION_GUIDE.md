# SyncSpace Week 4 — M2 Replay Timeline

## Included files
- `client/src/components/ReplayTimeline.jsx`
- `client/src/components/ReplayTimeline.css`
- `client/src/M2_INTEGRATION_GUIDE.md`

## Add to your existing App.jsx

Do not replace your existing App.jsx. Add this import:

```jsx
import { useCallback, useState } from "react";
import ReplayTimeline from "./components/ReplayTimeline";
```

Inside your existing component, add (unless you already have equivalent state):

```jsx
const [history, setHistory] = useState([]);
const [replaySnapshot, setReplaySnapshot] = useState(null);

const handleReplay = useCallback((snapshot, index) => {
  setReplaySnapshot(snapshot);
  console.log("Replaying history step:", index + 1, snapshot);
}, []);
```

Then place this JSX where you want the timeline to appear:

```jsx
<ReplayTimeline
  snapshots={history}
  onReplay={handleReplay}
  playbackSpeed={1000}
/>
```

## Snapshot format

The component expects `snapshots` to be an array. Each snapshot should ideally have a unique `id`, a `timestamp`, and your application's saved state, for example:

```js
{
  id: "snapshot-1",
  timestamp: new Date().toISOString(),
  shapes: [],
  code: "// saved editor state"
}
```

You must connect `history` to actual snapshots from your app/server. This UI does not persist history by itself and does not yet restore Konva strokes or Monaco content automatically. Connect `onReplay` to your canvas/editor restore logic when integrating with the existing SyncSpace architecture.

## Run
From the `client` directory:

```bash
npm run dev
```
