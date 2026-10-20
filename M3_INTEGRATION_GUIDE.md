# SyncSpace Week 4 — M3 Canvas Snapshot Rewind Engine

## Included
- `components/CanvasSnapshotReplay.jsx` — snapshot timeline and rewind controls.
- `components/CanvasSnapshotReplay.css` — styling.
- `utils/restoreCanvasSnapshot.js` — helper to map saved strokes/shapes to renderer descriptors.

## Integrate into your existing App.jsx

Do not replace your existing `App.jsx`. Add:

```jsx
import { useCallback, useState } from "react";
import CanvasSnapshotReplay from "./components/CanvasSnapshotReplay";
```

Use your app's existing snapshot state if available. Otherwise, example state:

```jsx
const [canvasSnapshots, setCanvasSnapshots] = useState([]);
const [isReplayOpen, setIsReplayOpen] = useState(false);
```

Connect the restore callback to your actual whiteboard state setter:

```jsx
const handleRestoreSnapshot = useCallback((shapes, snapshot) => {
  // Replace setCanvasObjects with the setter your whiteboard really uses.
  setCanvasObjects(shapes);
  console.log("Restored snapshot:", snapshot.id);
}, []);
```

Render where you want the replay panel:

```jsx
{isReplayOpen && (
  <CanvasSnapshotReplay
    snapshots={canvasSnapshots}
    onRestore={handleRestoreSnapshot}
    onExitReplay={() => setIsReplayOpen(false)}
  />
)}
```

`setCanvasObjects` is an example only. Do not paste it unchanged unless your existing component has that state setter. The callback must update the state that your React-Konva `Layer` maps over.

## Expected snapshot shape

```js
{
  id: "snapshot-001",
  timestamp: new Date().toISOString(),
  shapes: [
    {
      id: "stroke-001",
      type: "pen",
      points: [20, 30, 45, 55, 70, 65],
      stroke: "#111827",
      strokeWidth: 3
    }
  ]
}
```

Save actual canvas objects in `shapes`; this UI does not generate or persist snapshots by itself. If your app stores shapes under another property or uses different type names, adapt the helper and callback to your real schema.

## Run
From `client/`:

```bash
npm run dev
```

Test with two or more snapshots. Moving the slider should call `onRestore` with the selected snapshot's shapes. Connect it to your actual Konva renderer to see historical strokes restored on the canvas.
