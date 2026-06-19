import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

const RoomPage = () => {
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return setError("Username is required");
    
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${apiUrl}/api/createrooms`);
      
      if (res.data && res.data.id) {
        localStorage.setItem("username", username);
        navigate(`/editor/${res.data.id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return setError("Username is required");
    if (!roomId.trim()) return setError("Room ID is required");

    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${apiUrl}/api/rooms/${roomId}`);

      if (res.data) {
        localStorage.setItem("username", username);
        navigate(`/editor/${roomId}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Room not found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0b1020] flex items-center justify-center p-4">
      {/* Glow orb background effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#1d1d1d]/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden z-10 transition-all duration-300">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-white text-center mb-2">
            Code Editor
          </h1>
          <p className="text-gray-400 text-center mb-8 text-sm">
            Collaborate in real-time with your team
          </p>

          {/* Tabs */}
          <div className="flex bg-[#0b1020] rounded-lg p-1 mb-6">
            <button
              onClick={() => { setActiveTab("create"); setError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeTab === "create"
                  ? "bg-green-500 text-white shadow-lg"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Create Room
            </button>
            <button
              onClick={() => { setActiveTab("join"); setError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeTab === "join"
                  ? "bg-green-500 text-white shadow-lg"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Join Room
            </button>
          </div>

          {/* Form */}
          <form onSubmit={activeTab === "create" ? handleCreateRoom : handleJoinRoom} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-[#0b1020] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
              />
            </div>

            {activeTab === "join" && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Room ID
                </label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="e.g. A1B2C3D4E5F6"
                  className="w-full bg-[#0b1020] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors uppercase"
                />
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg shadow-lg shadow-green-500/30 transition-all duration-200 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed mt-6"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : activeTab === "create" ? (
                "Create New Room"
              ) : (
                "Join Room"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;