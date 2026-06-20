import { Editor } from "@monaco-editor/react";
import { useRef, useEffect, useState } from "react";
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";
import { MonacoBinding } from "y-monaco";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from 'react-hot-toast';


const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

const EditorPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>(() => {
    const urlUsername = new URLSearchParams(
      window.location.search
    ).get("username");
    return urlUsername || localStorage.getItem("username") || "";
  });
  const [user, setUser] = useState<{ name: string; color: string }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const { roomId: urlRoomId } = useParams<{ roomId: string }>();
  const [roomId, setRoomId] = useState<string>(urlRoomId?.toUpperCase() || "monaco-room");
  const [isJoinModalOpen, setIsJoinModalOpen] = useState<boolean>(false);
  const [newRoomId, setNewRoomId] = useState<string>("");

  const editorRef = useRef<any>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<SocketIOProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);


  // Create Y.Doc once
  useEffect(() => {
    if (!ydocRef.current) {
      ydocRef.current = new Y.Doc();
    }
    return () => {
      bindingRef.current?.destroy();
      providerRef.current?.destroy();
      ydocRef.current?.destroy();

      bindingRef.current = null;
      providerRef.current = null;
      ydocRef.current = null;
    };
  }, []);

  // useEffect(() => {
  //   // Bug fix #1: read from ref inside the effect, not at render time
  //   const ydoc = ydocRef.current;

  //   if (username && editorRef.current && ydoc) {
  //     const provider = new SocketIOProvider(
  //       apiUrl,
  //       "monaco-room",
  //       ydoc,
  //       {
  //         autoConnect: true,
  //       } // Connects immediately to server
  //     );

  //     // Bug fix #2: assign provider to ref so cleanup can destroy it
  //     providerRef.current = provider;

  //     provider.awareness.setLocalStateField("user", {
  //       name: username,
  //       color: "#16a34a",
  //     });

  //     provider.awareness.on("change", () => {
  //       // Bug fix #3 & #4: correctly extract nested user object and filter nulls
  //       const states = Array.from(provider.awareness.getStates().values());
  //       const users = states
  //         .map((state) => state.user as { name: string; color: string } | undefined)
  //         .filter((u): u is { name: string; color: string } => !!u && !!u.name);
  //       setUser(users);
  //     });

  //     const monacoBinding = new MonacoBinding(
  //       ydoc.getText("monaco"),
  //       editorRef.current.getModel(),
  //       new Set([editorRef.current]),
  //       provider.awareness
  //     );

  //     bindingRef.current?.destroy();
  //     bindingRef.current = monacoBinding;
  //   }

  //   const handleBeforeUnload = () => {
  //     providerRef.current?.awareness.setLocalStateField("user", null);
  //     providerRef.current?.destroy();
  //   };
  //   window.addEventListener("beforeunload", handleBeforeUnload);
  //   return () => {
  //     window.removeEventListener("beforeunload", handleBeforeUnload);
  //     providerRef.current?.destroy();
  //     bindingRef.current?.destroy();
  //   };
  // }, [username]);

  const handleMount = (editor: any) => {
    editorRef.current = editor;

    if (!ydocRef.current) {
      ydocRef.current = new Y.Doc();
    }

    const ydoc = ydocRef.current;

    // Destroy old instances
    bindingRef.current?.destroy();
    providerRef.current?.destroy();

    // Shared text
    const yText = ydoc.getText("monaco");

    // Create provider
    const provider = new SocketIOProvider(
      apiUrl,
      `room:${roomId}`,
      ydoc,
      {
        autoConnect: true,
      }
    );

    providerRef.current = provider;

    const currentUsername =
      localStorage.getItem("username") || username;

    provider.socket.on("connect", () => {
      provider.awareness.setLocalStateField("user", {
        name: currentUsername,
        color: "#16a34a",
      });
      // 1. Tell the backend this user is joining the room
      provider.socket.emit("join-room", { roomId, username: currentUsername });

      // 2. Listen for other users joining
      provider.socket.on("user-joined", (data: any) => {
        console.log("A user joined the room!", data);
        toast.success(`${data.username} joined the room`);
      });

      // 3. Listen for when a user leaves the room
      provider.socket.on("user-left", (data) => {
        console.log("A user left the room", data);
        toast.error(`${data.username} left the room`);
      })
    });

    // Listen for awareness changes
    provider.awareness.on("change", () => {
      const states = Array.from(
        provider.awareness.getStates().values()
      );
      console.log("Awareness States:", states);

      const users = states
        .map(
          (state: any) =>
            state.user as
            | { name: string; color: string }
            | undefined
        )
        .filter(
          (
            u
          ): u is { name: string; color: string } =>
            !!u
        );
      console.log("Users:", users);

      setUser(users);
    });

    // Monaco model
    const model = editor.getModel();

    if (!model) return;

    // Create binding
    const binding = new MonacoBinding(
      yText,
      model,
      new Set([editor]),
      provider.awareness
    );

    bindingRef.current = binding;
  };

  const handleJoin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue) return;
    setUsername(inputValue);
    localStorage.setItem("username", inputValue);
    window.history.pushState(
      {},
      "",
      "?username=" + encodeURIComponent(inputValue)
    );
  };


  if (!username) {
    return (
      <div className="flex items-center justify-center h-screen">
        {/* Bug fix #5: removed action="submit" which caused navigation to /submit URL */}
        <form className="flex flex-col items-center justify-center gap-3" onSubmit={handleJoin}>
          <input
            name="username"
            className="border border-gray-300 p-2 rounded-md"
            required={true}
            type="text"
            placeholder="Your username"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button
            type="submit"
            className="bg-white text-black font-semibold px-4 w-full py-2 rounded-md cursor-pointer hover:bg-gray-200 transition-colors duration-200 ease-in-out"
          >
            Join
          </button>
        </form>
      </div>
    );
  }

  return (
    <section className="h-screen w-full bg-[#0b1020] p-3 overflow-hidden">
      <div className="flex gap-3 h-full">
        {/* Sidebar */}
        <ul className="mt-5 flex flex-col gap-2">
          <h1 className="font-bold text-2xl text-white">
            Collaborators
          </h1>

          {user.map((u, index) => {
            const isActive =
              u.name === localStorage.getItem("username");

            return (
              <li
                key={u.name}
                className={`font-medium transition-all ${isActive
                  ? "text-green-400"
                  : "text-gray-300"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${isActive
                      ? "bg-green-500"
                      : "bg-gray-400"
                      }`}
                  />

                  <span>{index + 1}.</span>

                  <span>{u.name}</span>
                </div>
              </li>
            );
          })}
          <button onClick={() => setIsJoinModalOpen(true)} className="bg-white text-black font-semibold px-4 py-2 rounded-md cursor-pointer hover:bg-gray-200 transition-colors duration-200 ease-in-out">Join Room</button>
        </ul>

        {/* Editor */}
        <div className="flex-1 bg-[#1d1d1d] rounded-2xl overflow-hidden border border-[#2c2c2c]">
          <Editor
            className="mt-3"
            height="100%"
            defaultLanguage="javascript"
            defaultValue="// Start collaborating..."
            theme="vs-dark"
            onMount={handleMount}
            options={{
              fontSize: 16,
              minimap: {
                enabled: false,
              },
              automaticLayout: true,
            }}
          />
        </div>
      </div>

      {/* Join Room Modal */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1d1d1d] border border-[#2c2c2c] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Join Another Room</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (newRoomId.trim()) {
                window.location.href = `/editor/${newRoomId.trim().toUpperCase()}`;
              }
            }}>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Room ID
              </label>
              <input
                type="text"
                value={newRoomId}
                onChange={(e) => setNewRoomId(e.target.value.toUpperCase())}
                placeholder="e.g. A1B2C3D4E5F6"
                className="w-full bg-[#0b1020] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors uppercase mb-6"
                required
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="flex-1 py-2 rounded-lg font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg shadow-lg shadow-green-500/30 transition-all"
                >
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default EditorPage;