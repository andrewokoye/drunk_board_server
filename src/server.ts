import express from "express";
import http from "http";
import { Server } from "socket.io";
import { Player, Room } from "./interfaces";
const app = express();
const port = process.env.PORT || 3001;

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-memory room storage
const rooms: Record<number, Room> = {};
const roomCodes: Record<string, number> = {};
let nextRoomId = 1;


app.get("/", (_req, res) => {
  res.send("Tipsy Land server is running");
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.emit("connected", {
    message: "You are connected to Tipsy Land server"
  });

  // CREATE ROOM
  socket.on("createRoom", ({ roomCode, username }) => {
    if (roomCodes[roomCode]) {
      socket.emit("roomError", "Room already exists");
      return;
    }

    const roomId = nextRoomId++;
    roomCodes[roomCode] = roomId;

    rooms[roomId] = {
      roomId,
      roomCode,
      players: [
        { username, socketId: socket.id, disconnected: false }
      ]
    };

    socket.join(roomCode);

    socket.emit("roomCreated", { roomId, roomCode });
  });


  // JOIN ROOM
  socket.on("joinRoom", ({ roomCode, username }) => {
    const roomId = roomCodes[roomCode];
    if (!roomId) {
      socket.emit("roomError", "Room does not exist");
      return;
    }

    const room = rooms[roomId];

    // Check if username already exists (reconnect)
    const existing = room.players.find(p => p.username === username);

    if (existing) {
      existing.socketId = socket.id;
      existing.disconnected = false;
    } else {
      room.players.push({
        username,
        socketId: socket.id,
        disconnected: false
      });
    }

    socket.join(roomCode);

    io.to(roomCode).emit("playerJoined", room.players);
    socket.emit("roomJoined", { roomId, roomCode });
  });


  // LIST PLAYERS
  socket.on("listPlayers", (roomId) => {
    const room = rooms[roomId];
    if (!room) return;

    socket.emit("playersList", room.players);
  });

  // START GAME
  socket.on("startGame", (roomId) => {
    const room = rooms[roomId];
    if (!room) return;

    io.to(room.roomCode).emit("gameStarted", {
      roomId,
      players: room.players
    });
  });

  // HANDLE DISCONNECT
  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const player = room.players.find(p => p.socketId === socket.id);

      if (player) {
        player.disconnected = true;

        io.to(room.roomCode).emit("playersList", room.players);
      }
    }
  });

  // REMOVE PLAYER (kick or leave)
  socket.on("removePlayer", ({ roomId, username }) => {
    const room = rooms[roomId];
    if (!room) return;

    // Remove the player
    room.players = room.players.filter(p => p.username !== username);

    // Broadcast updated list
    io.to(room.roomCode).emit("playersList", room.players);
  });


});

httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
