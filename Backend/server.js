import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { YSocketIO } from "y-socket.io/dist/server";
import dotenv from "dotenv";
import generateRoomId from "./functions/idGeneratorFunc.js";
import cors from "cors";
import mongoose from "mongoose";
import Document from "./models/Document.js";
import * as Y from "yjs";

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));


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

// Document Persistence Logic
ysocket.on('document-loaded', async (doc) => {
    console.log(`Document loaded in memory: ${doc.name}`);
    try {
        const dbDoc = await Document.findOne({ roomId: doc.name });
        if (dbDoc && dbDoc.content) {
            console.log(`Applying existing state for ${doc.name} from MongoDB`);
            Y.applyUpdate(doc, dbDoc.content);
        } else {
            console.log(`No existing state for ${doc.name} in MongoDB, starting fresh.`);
        }
    } catch (err) {
        console.error(`Error loading document ${doc.name} from DB:`, err);
    }
});

// Debounce map to avoid saving on every single keystroke
const saveDebounceMap = new Map();

ysocket.on('document-update', async (doc, update) => {
    // Debounce saving to DB (e.g., save 2 seconds after last keystroke)
    if (saveDebounceMap.has(doc.name)) {
        clearTimeout(saveDebounceMap.get(doc.name));
    }
    
    saveDebounceMap.set(doc.name, setTimeout(async () => {
        try {
            const state = Y.encodeStateAsUpdate(doc);
            await Document.findOneAndUpdate(
                { roomId: doc.name },
                { content: Buffer.from(state), lastModified: new Date() },
                { upsert: true }
            );
            console.log(`Document ${doc.name} saved to MongoDB`);
        } catch (err) {
            console.error(`Error saving document ${doc.name} to DB:`, err);
        }
        saveDebounceMap.delete(doc.name);
    }, 2000));
});
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Summary of the flow: You type a character ➔ Saved in your Browser ➔ Sent to Server Memory ➔ Sent to other users' Browsers ➔ After 2 seconds of no typing, saved to MongoDB.

ysocket.nsp.on("connection", (socket) => {
    console.log("User connected to Yjs namespace:", socket.id);

    let currentRoomID = null;
    // Map to keep track of socket.id -> username
    const socketUsernames = new Map();

    //  1. Add `join-room` event listener
    socket.on("join-room", ({ roomId, username }) => {
        if (username) socketUsernames.set(socket.id, username);
        const upperRoomId = roomId.toUpperCase();
        currentRoomID = upperRoomId;

        // 2. Use Socket.io rooms
        socket.join(`room:${upperRoomId}`);
        let room = rooms.get(upperRoomId);

        // check whether the user is active
        if (!room) {
            room = {
                name: upperRoomId,
                createdAt: new Date(),
                activeUsers: new Set()
            };
            rooms.set(upperRoomId, room);
        }

        room.activeUsers.add(socket.id);
        console.log(room.activeUsers.size);

        // 3. Emit `user-joined` to specific room
        // .to() Send to everyone in room EXCEPT current user
        socket.to(`room:${upperRoomId}`).emit("user-joined", { roomId: upperRoomId, username });
        console.log(`User ${socket.id} (${username}) joined room ${upperRoomId}`);

    })
    socket.on("disconnect", () => {
        const username = socketUsernames.get(socket.id) || "A user";
        console.log(`User ${socket.id} (${username}) left room ${currentRoomID}`);
        if (currentRoomID) {
            rooms.get(currentRoomID)?.activeUsers.delete(socket.id);
        }
        // 3. Emit `user-left` to specific room
        socket.to(`room:${currentRoomID}`).emit("user-left", { userId: socket.id, username });
        socketUsernames.delete(socket.id);
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
    let room = rooms.get(id);
    
    // Auto-create room if it doesn't exist (e.g., after server restart)
    if (!room) {
        room = {
            name: id,
            createdAt: new Date(),
            activeUsers: new Set()
        };
        rooms.set(id, room);
    }
    
    res.status(200).json({
        name: room.name,
        createdAt: room.createdAt,
        activeUsers: Array.from(room.activeUsers)
    });
})
app.get("/api/listrooms", (req, res) => {
    const roomlist = [];
    rooms.forEach((room) => {
        roomlist.push({
            name: room.name,
            createdAt: room.createdAt,
            activeUsers: Array.from(room.activeUsers)
        });
    })
    res.status(200).json({ rooms: roomlist });
})

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});