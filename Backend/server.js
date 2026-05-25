import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { YSocketIO } from "y-socket.io/dist/server";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.static("public"))

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

// Yjs websocket server
const ysocket = new YSocketIO(io);

ysocket.initialize();

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

app.get("/", (req, res) => {
    res.json({
        message: "Backend running",
    });
});

app.get("/health", (req, res) => {
    res.json({
        status: "healthy",
    });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});