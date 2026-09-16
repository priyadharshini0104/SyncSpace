
import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { io } from "socket.io-client";

import * as Y from "yjs";

import Editor from "@monaco-editor/react";

import {
  Circle,
  Layer,
  Line,
  Rect,
  Stage,
  Text
} from "react-konva";


const SOCKET_URL =
  "http://localhost:5000";

const BOARD_WIDTH = 800;
const BOARD_HEIGHT = 600;


function createId() {
  return (
    Date.now() +
    "-" +
    Math.random()
      .toString(36)
      .substring(2, 9)
  );
}


function randomName() {
  return (
    "User-" +
    Math.floor(
      1000 +
      Math.random() * 9000
    )
  );
}


function App() {

  /* SOCKET */

  const socket = useMemo(
  () =>
    io(SOCKET_URL, {
      autoConnect: false
    }),
  []
);


  /* YJS DOCUMENT */

  const ydoc = useMemo(
    () => new Y.Doc(),
    []
  );


  /* YJS SHAPES MAP */

  const shapesMap = useMemo(
    () =>
      ydoc.getMap("shapes"),
    [ydoc]
  );
  const codeMap = useMemo(
  () =>
    ydoc.getMap("code"),
  [ydoc]
);


  /* STATES */

  const [connected, setConnected] =
    useState(false);

  const [joined, setJoined] =
    useState(false);

  const [name, setName] =
    useState(randomName());

  const [roomId, setRoomId] =
    useState("demo-room");

  const [users, setUsers] =
    useState([]);

  const [shapes, setShapes] =
    useState([]);

  const [tool, setTool] =
    useState("pen");

  const [remoteCursors, setRemoteCursors] =
    useState({});


  const [code, setCode] =
    useState(
`function hello() {
  console.log("Hello SyncSpace");
}`
    );


  /* DRAWING REFERENCES */

  const isDrawing =
    useRef(false);

  const currentShapeId =
    useRef(null);


  /* CURSOR TIMER */

  const cursorTimer =
    useRef(null);


  /* SOCKET CONNECTION */

  useEffect(() => {

  function handleConnect() {
    console.log(
      "Socket connected:",
      socket.id
    );

    setConnected(true);
  }

  function handleDisconnect() {
    console.log("Socket disconnected");

    setConnected(false);
  }

  socket.on(
    "connect",
    handleConnect
  );

  socket.on(
    "disconnect",
    handleDisconnect
  );

  socket.connect();

  return () => {

    socket.off(
      "connect",
      handleConnect
    );

    socket.off(
      "disconnect",
      handleDisconnect
    );

    socket.disconnect();

  };

}, [socket]);

  /* JOIN ROOM */

  useEffect(() => {

    socket.on(
      "room-joined",
      () => {

        setJoined(true);

      }
    );


    socket.on(
      "users-update",
      (userList) => {

        setUsers(
          userList || []
        );

      }
    );


    return () => {

      socket.off(
        "room-joined"
      );

      socket.off(
        "users-update"
      );

    };

  }, [socket]);


  /* YJS → REACT */

  useEffect(() => {

    function updateShapes() {

      const list = [];


      shapesMap.forEach(
        (value) => {

          try {

            list.push(
              JSON.parse(value)
            );

          } catch {

            console.log(
              "Invalid shape"
            );

          }

        }
      );


      list.sort(
        (a, b) =>
          a.createdAt -
          b.createdAt
      );


      setShapes(list);

    }


    updateShapes();


    shapesMap.observe(
      updateShapes
    );


    return () => {

      shapesMap.unobserve(
        updateShapes
      );

    };

  }, [shapesMap]);
  /* YJS CODE → REACT */

useEffect(() => {

  function updateCode() {

    const savedCode =
      codeMap.get("content");

    if (typeof savedCode === "string") {
      setCode(savedCode);
    }

  }

  updateCode();

  codeMap.observe(
    updateCode
  );

  return () => {

    codeMap.unobserve(
      updateCode
    );

  };

}, [codeMap]);


  /* SEND LOCAL YJS UPDATE */

  useEffect(() => {

    function sendUpdate(
      update,
      origin
    ) {

      if (
        origin === "remote"
      ) {

        return;

      }


      if (!joined) {

        return;

      }


      socket.emit(
        "yjs-update",
        {

          roomId,

          update:
            uint8ToBase64(
              update
            )

        }
      );

    }


    ydoc.on(
      "update",
      sendUpdate
    );


    return () => {

      ydoc.off(
        "update",
        sendUpdate
      );

    };

  }, [
    ydoc,
    socket,
    roomId,
    joined
  ]);


  /* RECEIVE YJS UPDATE */

  useEffect(() => {

    function receiveSync(
      update
    ) {

      Y.applyUpdate(
        ydoc,
        base64ToUint8(update),
        "remote"
      );

    }


    socket.on(
      "yjs-sync",
      receiveSync
    );


    socket.on(
      "yjs-update",
      receiveSync
    );


    return () => {

      socket.off(
        "yjs-sync",
        receiveSync
      );

      socket.off(
        "yjs-update",
        receiveSync
      );

    };

  }, [
    socket,
    ydoc
  ]);


  /* CURSOR AWARENESS */

  useEffect(() => {

    function receiveCursor(
      data
    ) {

      if (!data?.id) {

        return;

      }


      setRemoteCursors(
        (previous) => ({

          ...previous,

          [data.id]:
            data

        })
      );

    }


    function removeCursor(
      id
    ) {

      setRemoteCursors(
        (previous) => {

          const next = {
            ...previous
          };


          delete next[id];


          return next;

        }
      );

    }


    socket.on(
      "awareness-update",
      receiveCursor
    );


    socket.on(
      "awareness-remove",
      removeCursor
    );


    return () => {

      socket.off(
        "awareness-update",
        receiveCursor
      );

      socket.off(
        "awareness-remove",
        removeCursor
      );

    };

  }, [socket]);


  /* JOIN ROOM FUNCTION */

  function joinRoom() {

    if (
      !name.trim()
    ) {

      alert(
        "Please enter your name"
      );

      return;

    }


    if (
      !roomId.trim()
    ) {

      alert(
        "Please enter Room ID"
      );

      return;

    }


    socket.emit(
      "join-room",
      {

        roomId:
          roomId.trim(),

        username:
          name.trim()

      }
    );

  }


  /* UPDATE SHAPE */

  function updateShape(
    shape
  ) {

    shapesMap.set(
      shape.id,
      JSON.stringify(shape)
    );

  }


  /* POINTER DOWN */

  function handlePointerDown(
    event
  ) {

    if (!joined) {

      return;

    }


    const stage =
      event.target.getStage();


    const point =
      stage.getPointerPosition();


    if (!point) {

      return;

    }


    /* PEN */

    if (
      tool === "pen"
    ) {

      const shape = {

        id:
          createId(),

        type:
          "line",

        points: [
          point.x,
          point.y
        ],

        stroke:
          "#111827",

        strokeWidth:
          3,

        createdAt:
          Date.now()

      };


      isDrawing.current =
        true;


      currentShapeId.current =
        shape.id;


      updateShape(
        shape
      );

    }


    /* RECTANGLE */

    if (
      tool === "rectangle"
    ) {

      const shape = {

        id:
          createId(),

        type:
          "rectangle",

        x:
          point.x,

        y:
          point.y,

        width:
          0,

        height:
          0,

        stroke:
          "#2563eb",

        strokeWidth:
          3,

        createdAt:
          Date.now()

      };


      isDrawing.current =
        true;


      currentShapeId.current =
        shape.id;


      updateShape(
        shape
      );

    }


    /* TEXT */

    if (
      tool === "text"
    ) {

      const text =
        window.prompt(
          "Enter text:"
        );


      if (!text) {

        return;

      }


      const shape = {

        id:
          createId(),

        type:
          "text",

        x:
          point.x,

        y:
          point.y,

        text:
          text,

        fontSize:
          22,

        fill:
          "#111827",

        createdAt:
          Date.now()

      };


      updateShape(
        shape
      );

    }

  }


  /* POINTER MOVE */

  function handlePointerMove(
    event
  ) {

    const stage =
      event.target.getStage();


    const point =
      stage.getPointerPosition();


    if (!point) {

      return;

    }
    if (tool === "eraser") {
  const clickedShape = shapes.find((shape) => {

    if (shape.type === "line") {
      for (let i = 0; i < shape.points.length; i += 2) {
        const dx = shape.points[i] - point.x;
        const dy = shape.points[i + 1] - point.y;

        if (Math.sqrt(dx * dx + dy * dy) < 15) {
          return true;
        }
      }
    }

    if (shape.type === "rectangle") {
      return (
        point.x >= Math.min(shape.x, shape.x + shape.width) &&
        point.x <= Math.max(shape.x, shape.x + shape.width) &&
        point.y >= Math.min(shape.y, shape.y + shape.height) &&
        point.y <= Math.max(shape.y, shape.y + shape.height)
      );
    }

    if (shape.type === "text") {
      return (
        point.x >= shape.x &&
        point.x <= shape.x + 150 &&
        point.y >= shape.y &&
        point.y <= shape.y + 30
      );
    }

    return false;
  });

  if (clickedShape) {
    shapesMap.delete(clickedShape.id);
  }

  return;
}


    /* SEND CURSOR */

    clearTimeout(
      cursorTimer.current
    );


    cursorTimer.current =
      setTimeout(() => {

        if (!joined) {

          return;

        }


        socket.emit(
          "awareness-update",
          {

            roomId,

            awareness: {

              name,

              x:
                point.x,

              y:
                point.y

            }

          }
        );

      }, 20);


    /* DRAWING */

    if (
      !isDrawing.current
    ) {

      return;

    }


    const id =
      currentShapeId.current;


    if (!id) {

      return;

    }


    const raw =
      shapesMap.get(id);


    if (!raw) {

      return;

    }


    const shape =
      JSON.parse(raw);


    /* LINE */

    if (
      shape.type === "line"
    ) {

      shape.points.push(
        point.x,
        point.y
      );


      updateShape(
        shape
      );

    }


    /* RECTANGLE */

    if (
      shape.type === "rectangle"
    ) {

      shape.width =
        point.x -
        shape.x;


      shape.height =
        point.y -
        shape.y;


      updateShape(
        shape
      );

    }

  }


  /* POINTER UP */

  function handlePointerUp() {

    isDrawing.current =
      false;

    currentShapeId.current =
      null;

  }


  /* RENDER SHAPE */

  function renderShape(
    shape
  ) {

    /* LINE */

    if (
      shape.type === "line"
    ) {

      return (

        <Line

          key={
            shape.id
          }

          points={
            shape.points
          }

          stroke={
            shape.stroke
          }

          strokeWidth={
            shape.strokeWidth
          }

          lineCap="round"

          lineJoin="round"

        />

      );

    }


    /* RECTANGLE */

    if (
      shape.type === "rectangle"
    ) {

      return (

        <Rect

          key={
            shape.id
          }

          x={
            shape.width < 0
              ? shape.x +
                shape.width
              : shape.x
          }

          y={
            shape.height < 0
              ? shape.y +
                shape.height
              : shape.y
          }

          width={
            Math.abs(
              shape.width
            )
          }

          height={
            Math.abs(
              shape.height
            )
          }

          stroke={
            shape.stroke
          }

          strokeWidth={
            shape.strokeWidth
          }

        />

      );

    }


    /* TEXT */

    if (
      shape.type === "text"
    ) {

      return (

        <Text

          key={
            shape.id
          }

          x={
            shape.x
          }

          y={
            shape.y
          }

          text={
            shape.text
          }

          fontSize={
            shape.fontSize
          }

          fill={
            shape.fill
          }

        />

      );

    }


    return null;

  }


  /* JOIN PAGE */

  if (!joined) {

    return (

      <div className="join-page">

        <div className="join-card">

          <h1>
            SyncSpace
          </h1>


          <p>
            Real-Time Collaborative
            Whiteboard & Code Editor
          </p>


          <label>
            Your Name
          </label>


          <input

            value={
              name
            }

            onChange={
              (event) =>
                setName(
                  event.target.value
                )
            }

            placeholder="Enter your name"

          />


          <label>
            Room ID
          </label>


          <input

            value={
              roomId
            }

            onChange={
              (event) =>
                setRoomId(
                  event.target.value
                )
            }

            placeholder="demo-room"

          />


          <button
  type="button"
  onClick={() => {
    console.log("JOIN BUTTON CLICKED");
    joinRoom();
  }}
>
  Join Room
</button>

          <p>

            {connected
              ? "🟢 Server Connected"
              : "🔴 Connecting..."}

          </p>

        </div>

      </div>

    );

  }


  /* MAIN APPLICATION */

  return (

    <div className="app">


      {/* HEADER */}

      <header className="header">

        <div>

          <h1>
            SyncSpace
          </h1>

          <p>
            Real-Time Collaborative
            Workspace
          </p>

        </div>


        <div className="room-info">

          <span>
            Room:
          </span>

          <strong>
            {roomId}
          </strong>

          <span>
            👥
          </span>

          <strong>
            {users.length}
          </strong>

        </div>

      </header>


      {/* WORKSPACE */}

      <main className="workspace">


        {/* WHITEBOARD */}

        <section className="whiteboard">

          <div className="panel-title">

            <div>

              <h2>
                Whiteboard
              </h2>

              <span>
                Konva + Yjs CRDT
              </span>

            </div>


            <div className="toolbar">

              <button

                className={
                  tool === "pen"
                    ? "active"
                    : ""
                }

                onClick={() =>
                  setTool("pen")
                }

              >
                ✏️ Pen
              </button>


              <button

                className={
                  tool === "rectangle"
                    ? "active"
                    : ""
                }

                onClick={() =>
                  setTool(
                    "rectangle"
                  )
                }

              >
                ▭ Rectangle
              </button>


              <button

                className={
                  tool === "text"
                    ? "active"
                    : ""
                }

                onClick={() =>
                  setTool("text")
                }

              >
                T Text
              </button>
              <button
  className={
    tool === "eraser"
      ? "active"
      : ""
  }
  onClick={() =>
    setTool("eraser")
  }
>
  🧹 Eraser
</button>

            </div>

          </div>


          {/* CANVAS */}

          <div className="canvas-area">

            <Stage

              width={
                BOARD_WIDTH
              }

              height={
                BOARD_HEIGHT
              }

              onMouseDown={
                handlePointerDown
              }

              onMouseMove={
                handlePointerMove
              }

              onMouseUp={
                handlePointerUp
              }

              onMouseLeave={
                handlePointerUp
              }

              onTouchStart={
                handlePointerDown
              }

              onTouchMove={
                handlePointerMove
              }

              onTouchEnd={
                handlePointerUp
              }

            >

              <Layer>

                {/* BACKGROUND */}

                <Rect

                  x={0}

                  y={0}

                  width={
                    BOARD_WIDTH
                  }

                  height={
                    BOARD_HEIGHT
                  }

                  fill="white"

                />


                {/* SHAPES */}

                {shapes.map(
                  renderShape
                )}


                {/* REMOTE CURSORS */}

                {Object.entries(
                  remoteCursors
                ).map(
                  ([id, cursor]) => (

                    <React.Fragment
                      key={id}
                    >

                      <Circle

                        x={
                          cursor.x
                        }

                        y={
                          cursor.y
                        }

                        radius={6}

                        fill="red"

                      />


                      <Text

                        x={
                          cursor.x + 10
                        }

                        y={
                          cursor.y - 10
                        }

                        text={
                          cursor.name
                        }

                        fontSize={14}

                        fill="red"

                      />

                    </React.Fragment>

                  )
                )}

              </Layer>

            </Stage>

          </div>


          <div className="hint">

            Draw with Pen or Rectangle.
            Use Text to add text.
            Cursor/name is shared
            with other users.

          </div>

        </section>


        {/* CODE EDITOR */}

        <section className="code-section">

          <div className="panel-title">

            <div>

              <h2>
                Code Editor
              </h2>

              <span>
                Monaco Editor
              </span>

            </div>

          </div>


          <div className="editor">

            <Editor

              height="100%"

              defaultLanguage="javascript"

              theme="vs-dark"

              value={
                code
              }

              onChange={(value) => {
  const newCode = value || "";

  setCode(newCode);

  if (joined) {
    codeMap.set(
      "content",
      newCode
    );
  }
}}

              options={{

                fontSize: 15,

                minimap: {
                  enabled: false
                },

                automaticLayout:
                  true

              }}

            />

          </div>

        </section>


      </main>


      {/* FOOTER */}

      <footer className="footer">

        <span>

          {connected
            ? "🟢 Connected"
            : "🔴 Disconnected"}

        </span>


        <span>

          {users.length}
          {" "}
          user(s) in room

        </span>

      </footer>

    </div>

  );

}


/* UINT8 → BASE64 */

function uint8ToBase64(
  bytes
) {

  let binary = "";

  const chunk =
    0x8000;


  for (
    let i = 0;
    i < bytes.length;
    i += chunk
  ) {

    binary += String.fromCharCode(
      ...bytes.subarray(
        i,
        i + chunk
      )
    );

  }


  return btoa(binary);

}


/* BASE64 → UINT8 */

function base64ToUint8(
  base64
) {

  const binary =
    atob(base64);


  const bytes =
    new Uint8Array(
      binary.length
    );


  for (
    let i = 0;
    i < binary.length;
    i++
  ) {

    bytes[i] =
      binary.charCodeAt(i);

  }


  return bytes;

}


export default App;