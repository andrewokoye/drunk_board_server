export type GamePlayer = {
  id: string;          // socket.id or your own playerId
  username: string;        // username
  position: number;    // tile index
  tilesCompleted: number; // how many tiles/cards they’ve resolved
  skips: number;       // how many skip turns they have queued
};

export type GameState = {
  room_id: string;
  host_id: string;       // NEW
  status: "lobby" | "playing" | "finished";
  current_turn: string | null;
  players: GamePlayer[];
};

export type TileType =
  | "drink"
  | "neverHaveIEver"
  | "mostLikelyTo"
  | "truth"
  | "doOrDrink"
  | "spicyQuestion"
  | "story"
  | "pickSomeone"
  | "moveForward"
  | "moveBack"
  | "skipTurn"
  | "finish";


export interface BoardTile {

  position: number;

  type: TileType;

  value?: number;

  prompt?: string;
}
