export type RoomEvent =
  | { type: "category_fixed"; slot: "a" | "b"; category: string }
  | { type: "category_completed"; slot: "a" | "b"; category: string }
  | { type: "progress_updated"; slot: "a" | "b"; progress: number }
  | { type: "is_ready"; slot: "a" | "b" }
  | { type: "say"; slot: "a" | "b"; message: string }
  | { type: "ping"; slot: "a" | "b" }
  | { type: "get_in"; slot: "a" | "b" }
  | { type: "leave"; slot: "a" | "b" };

export const ROOM_EVENTS = {
  category_fixed: "category_fixed",
  category_completed: "category_completed",
  progress_updated: "progress_updated",
  is_ready: "is_ready",
  say: "say",
  ping: "ping",
  get_in: "get_in",
  leave: "leave",
} as const;
