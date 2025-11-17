import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Інакше фронт не підʼєднається
  },
});

// Тимчасове зберігання кімнат у пам'яті (нормально для Render FREE)
const rooms = {};

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // створення кімнати
  socket.on("createRoom", ({ roomId, nickname }) => {
    rooms[roomId] = {
      host: nickname,
      players: [nickname]
    };

    socket.join(roomId);
    socket.emit("roomCreated", { roomId });
  });

  // приєднання до кімнати
  socket.on("joinRoom", ({ roomId, nickname }) => {
    if (!rooms[roomId]) {
      socket.emit("roomNotFound");
      return;
    }

    rooms[roomId].players.push(nickname);

    socket.join(roomId);

    io.to(roomId).emit("playerJoined", {
      players: rooms[roomId].players,
    });

    socket.emit("roomJoined", { roomId });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// порт для Render
const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
