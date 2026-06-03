import { supabase } from "../lib/supabase";
import { BOARD } from "./board";
import { GameState, GamePlayer } from "./types";
import { handleTileEffect } from "./tiles";
import { io } from "../server"; // depends on your export

export async function handleMovePlayer(
  roomCode: string,
  state: GameState,
  playerId: string,
  diceValue: number
) {
  const players = [...state.players];
  const playerIndex = players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return;

  const player = players[playerIndex];

  let newPosition = player.position + diceValue;
  if (newPosition >= BOARD.length - 1) {
    newPosition = BOARD.length - 1;
  }

  player.position = newPosition;
  player.tilesCompleted += 1;

  const tile = BOARD[newPosition];

  const updatedState: GameState = {
    ...state,
    players
  };

  await supabase
    .from("games")
    .update({ players })
    .eq("room_id", roomCode);

  io.to(roomCode).emit("playerMoved", {
    playerId,
    newPosition
  });

  await handleTileEffect(roomCode, updatedState, player, tile);
}
