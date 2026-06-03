import { supabase } from "../lib/supabase";
import { GameState } from "./types";

export async function loadGame(roomCode: string): Promise<GameState | null> {
  const { data } = await supabase
    .from("games")
    .select("*")
    .eq("room_id", roomCode)
    .single();

  return data as GameState | null;
}

export async function saveGame(roomCode: string, state: Partial<GameState>) {
  await supabase
    .from("games")
    .update(state)
    .eq("room_id", roomCode);
}

