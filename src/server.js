import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();

app.use(cors({
  origin: "https://bunker-xi-sepia.vercel.app", // твій фронтенд
  methods: ["GET", "POST"],
  credentials: true
}));

// Health-check (ОБОВʼЯЗКОВО для Render)
app.get("/", (req, res) => {
  res.send("Backend is running");
});

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://bunker-xi-sepia.vercel.app",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket"] // мобільний MUST-HAVE
});

// Кімнати
const rooms = {};

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("createRoom", ({ roomId, nickname }) => {
    rooms[roomId] = {
      host: nickname,
      players: [nickname],
    };

    socket.join(roomId);
    socket.emit("roomCreated", { roomId });
  });

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

const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
