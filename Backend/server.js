import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { YSocketIO } from "y-socket.io/dist/server";
import dotenv from "dotenv";
import generateRoomId from "./functions/idGeneratorFunc.js";
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

const rooms = new Map();

app.get("/api/createrooms", (req, res) => {
    const id = generateRoomId();
    const room = rooms.get(id);
    if (room) {
        res.status(404).json({ message: "Room already exists" })
    } else {
        rooms.set(id,
            {
                name: id,
                createdAt: new Date(),
                activeUsers: new Set()
            });
        res.status(200).json({ message: "Room created", id })
    }
})
app.get("/api/rooms/:id", (req, res) => {
    const {id} = req.params;
    const room = rooms.get(id);
    if (room) {
        res.status(200).json(room);
    } else {
        res.status(404).json({ message: "Room not found"})
    }
})
app.get("/api/listrooms", (req, res) => {
    const roomlist = [];
    rooms.forEach((room) => {
        roomlist.push({
            name: room.name,
            createdAt: room.createdAt,
            activeUsers: room.activeUsers
        });
    })
    res.status(200).json({ rooms: roomlist });
})




const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});