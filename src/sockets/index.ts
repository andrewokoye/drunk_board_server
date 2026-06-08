import { Server, Socket } from "socket.io";
import { registerLobbyHandlers } from "./lobbyHandlers";
import { registerGameHandlers } from "./gameHandlers";

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    registerLobbyHandlers(io, socket);
    registerGameHandlers(io, socket);
  });
}
