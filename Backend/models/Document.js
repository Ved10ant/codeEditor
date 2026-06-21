import mongoose from "mongoose";

const DocumentSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true
    },
    content: {
        type: Buffer, // Storing Yjs update state as binary
        default: null
    },
    lastModified: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Document = mongoose.model("Document", DocumentSchema);

export default Document;
