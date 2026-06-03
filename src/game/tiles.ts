import { TileDef, GameState, GamePlayer } from "./types";
import { handleMovePlayer } from "./movement";
import { endTurn } from "./turn";
import { handleWin } from "./win";
import { io } from "../server";
import { supabase } from "../lib/supabase";

export async function handleTileEffect(
  roomCode: string,
  state: GameState,
  player: GamePlayer,
  tile: TileDef
) {
  switch (tile.type) {
    case "normal":
      io.to(roomCode).emit("tileEffect", {
        type: "normal",
        playerId: player.id
      });
      await endTurn(roomCode, state, player.id);
      break;

    case "drink":
      io.to(roomCode).emit("tileEffect", {
        type: "drink",
        playerId: player.id,
        amount: tile.value ?? 1
      });
      await endTurn(roomCode, state, player.id);
      break;

    case "challenge":
      io.to(roomCode).emit("challengeTriggered", {
        playerId: player.id,
        challengeId: tile.challengeId
      });
      break;

    case "moveForward":
      await handleMovePlayer(roomCode, state, player.id, tile.value ?? 1);
      break;

    case "moveBack":
      await handleMovePlayer(roomCode, state, player.id, -(tile.value ?? 1));
      break;

    case "skipTurn":
      player.skips += 1;

      await supabase
        .from("games")
        .update({ players: state.players })
        .eq("room_id", roomCode);

      io.to(roomCode).emit("tileEffect", {
        type: "skipTurn",
        playerId: player.id
      });

      await endTurn(roomCode, state, player.id);
      break;

    case "finish":
      await handleWin(roomCode, state, player.id);
      break;
  }
}
