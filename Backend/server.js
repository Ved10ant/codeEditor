import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { YSocketIO } from "y-socket.io/dist/server";
import dotenv from "dotenv";
import generateRoomId from "./functions/idGeneratorFunc.js";
import cors from "cors";

dotenv.config();


const app = express();
app.use(express.static("public"))

app.use(cors(
    {
        origin:"*",
        methods: ["GET","POST"],
    }
))

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

ysocket.nsp.on("connection", (socket) => {
    console.log("User connected to Yjs namespace:", socket.id);

    let currentRoomID = null;

    //  1. Add `join-room` event listener
    socket.on("join-room", ({ roomId }) => {
        const upperRoomId = roomId.toUpperCase();
        currentRoomID = upperRoomId;

        // 2. Use Socket.io rooms
        socket.join(`room:${upperRoomId}`);
        const room = rooms.get(upperRoomId);

        // check whether the user is active
        if (room) {
            room.activeUsers.add(socket.id);
            console.log(room.activeUsers.size)
        }

        // 3. Emit `user-joined` to specific room
        // .to() Send to everyone in room EXCEPT current user
        socket.to(`room:${upperRoomId}`).emit("user-joined", { roomId: upperRoomId });
        console.log(`User ${socket.id} joined room ${upperRoomId}`);

    })
    socket.on("disconnect", () => {
        console.log(`User ${socket.id} left room ${currentRoomID}`);
        if (currentRoomID) {
            rooms.get(currentRoomID)?.activeUsers.delete(socket.id);
        }
        // 3. Emit `user-left` to specific room
        socket.to(`room:${currentRoomID}`).emit("user-left", { userId: socket.id });
    })
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
    const id = req.params.id.toUpperCase();
    const room = rooms.get(id);
    if (room) {
        res.status(200).json(room);
    } else {
        res.status(404).json({ message: "Room not found" })
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