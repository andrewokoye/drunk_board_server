import { supabase } from "../lib/supabase";
import { GameState } from "./types";
import { io } from "../server";

export async function endTurn(
  roomCode: string,
  state: GameState,
  currentPlayerId: string
) {
  const players = state.players;
  const currentIndex = players.findIndex(p => p.id === currentPlayerId);
  if (currentIndex === -1) return;

  let nextIndex = (currentIndex + 1) % players.length;

  while (players[nextIndex].skips > 0) {
    players[nextIndex].skips -= 1;
    nextIndex = (nextIndex + 1) % players.length;
  }

  const nextPlayerId = players[nextIndex].id;

  await supabase
    .from("games")
    .update({
      current_turn: nextPlayerId,
      players
    })
    .eq("room_id", roomCode);

  io.to(roomCode).emit("turnChanged", nextPlayerId);
  io.to(roomCode).emit("gameStateUpdated", {
    ...state,
    current_turn: nextPlayerId,
    players
  });
}
