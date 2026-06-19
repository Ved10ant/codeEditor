import crypto from "crypto";

function generateRoomId() {
    return crypto.randomBytes(6).toString("hex").toUpperCase();
};

export default generateRoomId;