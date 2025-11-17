import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const rooms = {};

function updateRoomActivity(roomId) {
  if (rooms[roomId]) {
    rooms[roomId].lastActive = Date.now();
  }
}

setInterval(() => {
  const now = Date.now();
  const TIMEOUT = 3 * 60 * 1000; // 3 хвилини простою

  for (const roomId in rooms) {
    const room = rooms[roomId];

    // якщо нікого немає — видаляємо
    if (Object.keys(room.players).length === 0) {
      delete rooms[roomId];
      console.log(`Room ${roomId} deleted (empty).`);
      continue;
    }

    // якщо давно не активна — видаляємо
    if (now - room.lastActive > TIMEOUT) {
      delete rooms[roomId];
      console.log(`Room ${roomId} deleted (timeout).`);
    }
  }
}, 60 * 1000);

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("createRoom", ({ roomId, nickname }) => {
    rooms[roomId] = {
      host: socket.id,
      players: { [socket.id]: nickname },
      lastActive: Date.now()
    };

    socket.join(roomId);

    socket.emit("roomCreated", {
      roomId,
      players: Object.values(rooms[roomId].players),
      host: rooms[roomId].players[rooms[roomId].host]
    });
  });

  socket.on("joinRoom", ({ roomId, nickname }) => {
    const room = rooms[roomId];

    if (!room) {
      socket.emit("roomNotFound");
      return;
    }

    room.players[socket.id] = nickname;
    updateRoomActivity(roomId);

    socket.join(roomId);

    io.to(roomId).emit("playerJoined", {
      players: Object.values(room.players),
      host: room.players[room.host]
    });

    socket.emit("roomJoined", {
      roomId,
      players: Object.values(room.players),
      host: room.players[room.host]
    });
  });

  socket.on("getRoomState", (roomId) => {
    const room = rooms[roomId];
    if (!room) return;

    socket.emit("roomState", {
      players: Object.values(room.players),
      host: room.players[room.host]
    });
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);

    for (const roomId in rooms) {
      const room = rooms[roomId];

      if (room.players[socket.id]) {
        delete room.players[socket.id];
        updateRoomActivity(roomId);

        // якщо хост вийшов — новий хост перший у списку
        const ids = Object.keys(room.players);
        room.host = ids[0] ?? null;

        // якщо кімната порожня — видаляємо
        if (ids.length === 0) {
          delete rooms[roomId];
          console.log(`Room ${roomId} auto-deleted (no players).`);
          return;
        }

        // повідомляємо кімнату
        io.to(roomId).emit("playerJoined", {
          players: Object.values(room.players),
          host: room.players[room.host]
        });

        return;
      }
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log("Server running:", PORT));
