type AnyRole =
  | "girlfriend"
  | "boyfriend"
  | "partner"
  | "friend"
  | "roommate"
  | "workmate"
  | "gym bro"
  | "gym girl";

export interface Room {
  room_id: string; // Partition Key

  // NEW SCHEMA - Neutral role fields
  a_name?: string;
  b_name?: string;
  a_emoji?: string;
  b_emoji?: string;
  a_role?: AnyRole; // Store the relationship role for slot A
  b_role?: AnyRole; // Store the relationship role for slot B

  animal_a?: string;
  animal_b?: string;
  place_a?: string;
  place_b?: string;
  plant_a?: string;
  plant_b?: string;
  character_a?: string; // JSON string para arrays
  character_b?: string;
  season_a?: string;
  season_b?: string;
  hobby_a?: string;
  hobby_b?: string;
  food_a?: string;
  food_b?: string;
  colour_a?: string;
  colour_b?: string;
  drink_a?: string;
  drink_b?: string;

  a_ready?: boolean;
  b_ready?: boolean;
  created_at: string;
  updated_at: string;

  // Realtime fields
  realtime_a_ready?: boolean;
  realtime_b_ready?: boolean;
  realtime_a_progress?: number;
  realtime_b_progress?: number;
  realtime_a_fixed_category?: string;
  realtime_b_fixed_category?: string;
  realtime_a_completed_categories?: { [category: string]: number };
  realtime_b_completed_categories?: { [category: string]: number };
  realtime_chat_messages?: string[];
  realtime_in_room_a?: boolean;
  realtime_in_room_b?: boolean;

  ttl?: number;
}
