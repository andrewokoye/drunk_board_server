export interface Player {
  username: string;
  socketId: string;
  disconnected: boolean;
}

export interface Room {
  roomId: number;
  roomCode: string;
  players: Player[];
}
