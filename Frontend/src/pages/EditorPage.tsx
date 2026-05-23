import { Editor } from "@monaco-editor/react";
import { useRef, useEffect } from "react";
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";
import { MonacoBinding } from "y-monaco";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

const EditorPage = () => {
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

  const handleMount = (editor: any) => {
    editorRef.current = editor;

    // Safety check
    if (!ydocRef.current) {
      ydocRef.current = new Y.Doc();
    }

    const ydoc = ydocRef.current;

    // Create shared text
    const yText = ydoc.getText("monaco");

    // Cleanup old instances
    bindingRef.current?.destroy();
    providerRef.current?.destroy();

    // Provider
    const provider = new SocketIOProvider(
      apiUrl,
      "monaco-room",
      ydoc,
      {
        autoConnect: true,
      }
    );

    providerRef.current = provider;

    // Monaco model
    const model = editor.getModel();

    if (!model) return;

    // Binding
    const binding = new MonacoBinding(
      yText,
      model,
      new Set([editor]),
      provider.awareness
    );

    bindingRef.current = binding;
  };

  return (
    <section className="h-screen w-full bg-[#0b1020] p-3 overflow-hidden">
      <div className="flex gap-3 h-full">

        {/* Sidebar */}
        <div className="w-[320px] min-w-[320px] bg-[#e9e5d7] rounded-2xl overflow-hidden flex flex-col p-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Collaborators
          </h2>
        </div>

        {/* Editor */}
        <div className="flex-1 bg-[#1d1d1d] rounded-2xl overflow-hidden border border-[#2c2c2c]">
          <Editor
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
    </section>
  );
};

export default EditorPage;