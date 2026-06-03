import { TileDef } from "./types";

export const BOARD: TileDef[] = [
  { id: "1", type: "normal" },
  { id: "2", type: "drink", value: 2 },
  { id: "3", type: "challenge", challengeId: "C1" },
  { id: "4", type: "moveForward", value: 3 },
  { id: "5", type: "moveBack", value: 2 },
  { id: "6", type: "skipTurn" },
  { id: "7", type: "finish" }
];
