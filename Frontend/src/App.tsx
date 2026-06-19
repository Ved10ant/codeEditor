import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import EditorPage from "./pages/EditorPage";
import RoomPage from "./pages/RoomPage";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RoomPage />} />
        <Route path="/editor/:roomId" element={<EditorPage />} />
      </Routes>
    </Router>
  );
};

export default App;