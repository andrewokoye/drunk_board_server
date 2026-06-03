import express from "express";
import http from "http";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./sockets";

const app = express();
const port = process.env.PORT || 3001;

const httpServer = http.createServer(app);

export const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

registerSocketHandlers(io);

httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
});