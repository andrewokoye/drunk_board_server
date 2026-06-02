import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const port = process.env.PORT || 3001;

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*", // in production you can restrict to your Vercel domain
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
});

httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
