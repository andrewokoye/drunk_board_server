import { supabase } from "../lib/supabase";
import { GameState } from "./types";
import { io } from "../server";

export async function handleWin(
  roomCode: string,
  state: GameState,
  winnerId: string
) {
  const players = state.players;
  const winner = players.find(p => p.id === winnerId);
  if (!winner) return;

  const updatedState = {
    status: "finished",
    current_turn: null,
    players
  };

  await supabase
    .from("games")
    .update(updatedState)
    .eq("room_id", roomCode);

  io.to(roomCode).emit("gameStateUpdated", updatedState);

  io.to(roomCode).emit("gameWon", {
    winnerId,
    winnerName: winner.username,
    finalPlayers: players
  });

  console.log(`Game ${roomCode} finished — winner: ${winner.username}`);
}
