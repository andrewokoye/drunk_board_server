import { BoardTile, GameState, GamePlayer } from "./types";
import { handleMovePlayer } from "./movement";
import { endTurn } from "./turn";
import { handleWin } from "./win";
import { io } from "../server";
import { supabase } from "../lib/supabase";

export async function handleTileEffect(roomCode : string, state : GameState, player : GamePlayer, tile : BoardTile) {
  switch (tile.type) {

    case "drink":
      io.to(roomCode).emit("tileEffect", {
        type: "drink",
        amount: tile.value,
        playerId: player.id
      });
      break;

    case "moveForward":
    case "moveBack":
      io.to(roomCode).emit("tileEffect", {
        type: tile.type,
        amount: tile.value,
        playerId: player.id
      });
      break;

    case "skipTurn":
      io.to(roomCode).emit("tileEffect", {
        type: "skipTurn",
        playerId: player.id
      });
      break;

    case "truth":
    case "doOrDrink":
    case "spicyQuestion":
    case "neverHaveIEver":
    case "mostLikelyTo":
    case "pickSomeone":
    case "story":
      io.to(roomCode).emit("challengeTriggered", {
        playerId: player.id,
        prompt: tile.prompt,
        type: tile.type
      });
      break;

    case "finish":
      io.to(roomCode).emit("gameWon", {
        winnerId: player.id,
        winnerName: player.username,
        finalPlayers: state.players
      });
      break;
  }
}

