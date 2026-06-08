import { Server, Socket } from "socket.io";
import { GameState } from "../game/types";
import { loadGame } from "../game/state";
import { handleMovePlayer } from "../game/movement";
import { endTurn } from "../game/turn";

export function registerGameHandlers(io: Server, socket: Socket) {

  //REQUEST GAME STATE
  socket.on("requestGameState", async ({ roomCode }) => {
    const game = await loadGame(roomCode);
    if (game) socket.emit("gameStateUpdated", game);
  });


  //
  // ROLL DICE
  //
  socket.on("rollDice", async ({ roomCode }: { roomCode: string }) => {
    const game = await loadGame(roomCode);
    if (!game) return;

    const state: GameState = game;

    // Enforce turn
    if (state.current_turn !== socket.id) {
      socket.emit("gameError", "Not your turn");
      return;
    }

    const value = Math.floor(Math.random() * 6) + 1;

    io.to(roomCode).emit("diceRolled", {
      playerId: socket.id,
      value
    });

    // Move player server-side
    await handleMovePlayer(roomCode, state, socket.id, value);
  });

  //
  // TILE RESULT
  //
  socket.on("challengeResult", async ({ roomCode }: { roomCode: string }) => {
    const game = await loadGame(roomCode);
    if (!game) return;

    await endTurn(roomCode, game, socket.id);
  });

  socket.on("tileEffectComplete", async ({ roomCode }) => {
    const game = await loadGame(roomCode);
    if (!game) return;

    await endTurn(roomCode, game, socket.id);
  });


}
