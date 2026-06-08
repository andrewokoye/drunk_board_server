import { Server, Socket } from "socket.io";
import { supabase } from "../lib/supabase";
import { GamePlayer, GameState } from "../game/types";

export function registerLobbyHandlers(io: Server, socket: Socket) {

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
        host_id: socket.id,  
        players: [
        {
          id: socket.id,
          username,
          position: 0,
          tilesCompleted: 0,
          skips: 0
        }],
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

    // Add player
    const { data: game } = await supabase
      .from("games")
      .select("*")
      .eq("room_id", roomCode)
      .single();

    const updatedPlayers = game.players.some((p: any) => p.username === username)
  ? game.players
  : [
      ...game.players,
      {
        id: socket.id,
        username,
        position: 0,
        tilesCompleted: 0,
        skips: 0
      }
    ];

    await supabase
      .from("games")
      .update({ players: updatedPlayers })
      .eq("room_id", roomCode);

    socket.join(roomCode);

    // Emit structured player list
    const playerObjects = updatedPlayers.map((p: GamePlayer) => ({
      username: p.username,
      disconnected: false
    }));



    io.to(roomCode).emit("playerJoined", playerObjects);
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
    const updatedPlayers = game.players.some((p: any) => p.username === username)
    ? game.players
    : [
        ...game.players,
        {
          id: socket.id,
          username,
          position: 0,
          tilesCompleted: 0,
          skips: 0
        }
      ];


    await supabase
    .from("games")
    .update({
      players: updatedPlayers,
      host_id: game.host_id   // PRESERVE HOST
    })
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
    const playerObjects = updatedPlayers.map((p: GamePlayer) => ({
      username: p.username,
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

    const playerObjects = game.players.map((p: GamePlayer) => ({
      username: p.username,
      disconnected: false
    }));


    socket.emit("playersList", playerObjects);
  });


  // START GAME
  socket.on("startGame", async (roomCode: string) => {
    const { data: game } = await supabase
      .from("games")
      .select("*")
      .eq("room_id", roomCode)
      .single();

    if (!game) return;

    const players: GamePlayer[] = game.players;

    if (!players || players.length < 2) {
      socket.emit("gameError", "Need at least 2 players to start");
      return;
    }

    if (socket.id !== game.host_id) {
      socket.emit("gameError", "Only the host can start the game");
      return;
    }

    const firstPlayerId = players[0].id;

    const updated: GameState = {
      room_id: roomCode,
      host_id: game.host_id,
      status: "playing",
      current_turn: firstPlayerId,
      players,
    };


    await supabase
      .from("games")
      .update(updated)
      .eq("room_id", roomCode);

    io.to(roomCode).emit("gameStateUpdated", updated);
    io.to(roomCode).emit("turnChanged", firstPlayerId);
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

    const updatedPlayers = game.players.filter(
      (p: GamePlayer) => p.username !== username
    );


    await supabase
    .from("games")
    .update({
      players: updatedPlayers,
      host_id: game.players.host_id
    })
    .eq("room_id", roomCode);


    // Remove from connected players
    await supabase
      .from("connected_players")
      .delete()
      .eq("room_id", roomCode)
      .eq("username", username);

    io.to(roomCode).emit("playersList", updatedPlayers);
  });

}
