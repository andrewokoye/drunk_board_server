import express from "express";
import http from "http";
import { Server } from "socket.io";
import { supabase } from "./lib/supabase";

const app = express();
const port = process.env.PORT || 3001;

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.get("/", (_req, res) => {
  res.send("Tipsy Land server is running");
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.emit("connected", {
    message: "You are connected to Tipsy Land server"
  });

  // CREATE ROOM
  socket.on("createRoom", async ({ roomCode, username }) => {
    // Check if room exists
    const { data: existing } = await supabase
      .from("games")
      .select("*")
      .eq("room_id", roomCode)
      .single();

    if (existing) {
      socket.emit("roomError", "Room already exists");
      return;
    }

    // Create room in Supabase
    const { error } = await supabase
      .from("games")
      .insert({
        room_id: roomCode,
        players: [username],
        status: "lobby"
      });

    if (error) {
      socket.emit("roomError", "Could not create room");
      return;
    }

    // add creator as a connected player
  await supabase
    .from("connected_players")
    .insert({
      room_id: roomCode,
      username,
      socket_id: socket.id
    });

    socket.join(roomCode);

    // Emit structured player list
  const playerObjects = [{
    username,
    disconnected: false
  }];

    socket.emit("roomCreated", { roomCode });
  });


  // JOIN ROOM
  socket.on("joinRoom", async ({ roomCode, username }) => {
    const { data: game } = await supabase
      .from("games")
      .select("*")
      .eq("room_id", roomCode)
      .single();

    if (!game) {
      socket.emit("roomError", "Room does not exist");
      return;
    }

    // Add player if not already in list
    const updatedPlayers = game.players.includes(username)
      ? game.players
      : [...game.players, username];

    await supabase
      .from("games")
      .update({ players: updatedPlayers })
      .eq("room_id", roomCode);

    // Add to connected players table
    await supabase
      .from("connected_players")
      .insert({
        room_id: roomCode,
        username,
        socket_id: socket.id
      });

    socket.join(roomCode);

    // Emit structured player objects
    const playerObjects = updatedPlayers.map((name : string) => ({
      username: name,
      disconnected: false
    }));

    io.to(roomCode).emit("playerJoined", playerObjects);
    socket.emit("roomJoined", { roomCode });
  });



  // LIST PLAYERS
  socket.on("listPlayers", async (roomCode) => {
    const { data: game } = await supabase
      .from("games")
      .select("players")
      .eq("room_id", roomCode)
      .single();

    if (!game) return;

    const playerObjects = game.players.map((name : string) => ({
      username: name,
      disconnected: false
    }));

    socket.emit("playersList", playerObjects);
  });


  // START GAME
  socket.on("startGame", async (roomCode) => {
    await supabase
      .from("games")
      .update({ status: "started" })
      .eq("room_id", roomCode);

    const { data: game } = await supabase
      .from("games")
      .select("*")
      .eq("room_id", roomCode)
      .single();

    io.to(roomCode).emit("gameStarted", game);
  });

  // HANDLE DISCONNECT
  socket.on("disconnect", async () => {
    // Find which room this socket belonged to
    const { data: entry } = await supabase
      .from("connected_players")
      .select("*")
      .eq("socket_id", socket.id)
      .single();

    if (!entry) return;

    const { room_id, username } = entry;

    // Remove from connected players
    await supabase
      .from("connected_players")
      .delete()
      .eq("socket_id", socket.id);

    // Check if room is now empty
    const { data: stillConnected } = await supabase
      .from("connected_players")
      .select("*")
      .eq("room_id", room_id);

    if (stillConnected && stillConnected.length === 0) {
      // Start grace timer
      setTimeout(async () => {
        const { data: checkAgain } = await supabase
          .from("connected_players")
          .select("*")
          .eq("room_id", room_id);

        if (checkAgain && checkAgain.length === 0) {
          console.log(`Deleting room ${room_id}`);

          await supabase.from("games").delete().eq("room_id", room_id);
        }
      }, 30000); // 30 seconds
    }

    // Notify clients (optional)
    io.to(room_id).emit("playerDisconnected", username);
  });


  // REMOVE PLAYER (kick or leave)
  socket.on("removePlayer", async ({ roomCode, username }) => {
    const { data: game } = await supabase
      .from("games")
      .select("players")
      .eq("room_id", roomCode)
      .single();

    if (!game) return;

    const updatedPlayers = game.players.filter((p : string) => p !== username);

    await supabase
      .from("games")
      .update({ players: updatedPlayers })
      .eq("room_id", roomCode);

    // Remove from connected players
    await supabase
      .from("connected_players")
      .delete()
      .eq("room_id", roomCode)
      .eq("username", username);

    io.to(roomCode).emit("playersList", updatedPlayers);
  });


});

httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
