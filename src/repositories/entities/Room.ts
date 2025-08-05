import { Entity } from "electrodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

type AnyRole =
  | "girlfriend"
  | "boyfriend"
  | "partner"
  | "friend"
  | "roommate"
  | "workmate"
  | "gym bro"
  | "gym girl";

export interface RoomItem {
  room_id: string;
  a_name?: string;
  b_name?: string;
  a_emoji?: string;
  b_emoji?: string;
  a_role?: AnyRole;
  b_role?: AnyRole;
  animal_a?: string;
  animal_b?: string;
  place_a?: string;
  place_b?: string;
  plant_a?: string;
  plant_b?: string;
  character_a?: string;
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
  realtime_a_ready?: boolean;
  realtime_b_ready?: boolean;
  realtime_a_progress?: number;
  realtime_b_progress?: number;
  realtime_a_fixed_category?: string;
  realtime_b_fixed_category?: string;
  realtime_a_completed_categories?: Array<{ category: string; value: number }>;
  realtime_b_completed_categories?: Array<{ category: string; value: number }>;
  realtime_chat_messages?: string[];
  realtime_in_room_a?: boolean;
  realtime_in_room_b?: boolean;
  ttl?: number;
}

export const createRoomEntity = (client: DynamoDBDocumentClient) => {
  return new Entity(
    {
      model: {
        entity: "Room",
        version: "1",
        service: "urpartner",
      },
      attributes: {
        room_id: {
          type: "string",
          required: true,
        },
        a_name: { type: "string" },
        b_name: { type: "string" },
        a_emoji: { type: "string" },
        b_emoji: { type: "string" },
        a_role: { type: "string" },
        b_role: { type: "string" },
        animal_a: { type: "string" },
        animal_b: { type: "string" },
        place_a: { type: "string" },
        place_b: { type: "string" },
        plant_a: { type: "string" },
        plant_b: { type: "string" },
        character_a: { type: "string" },
        character_b: { type: "string" },
        season_a: { type: "string" },
        season_b: { type: "string" },
        hobby_a: { type: "string" },
        hobby_b: { type: "string" },
        food_a: { type: "string" },
        food_b: { type: "string" },
        colour_a: { type: "string" },
        colour_b: { type: "string" },
        drink_a: { type: "string" },
        drink_b: { type: "string" },
        a_ready: { type: "boolean" },
        b_ready: { type: "boolean" },
        created_at: {
          type: "string",
          required: true,
          default: () => new Date().toISOString(),
        },
        updated_at: {
          type: "string",
          required: true,
          default: () => new Date().toISOString(),
          watch: "*",
          set: () => new Date().toISOString(),
        },
        realtime_a_ready: { type: "boolean" },
        realtime_b_ready: { type: "boolean" },
        realtime_a_progress: { type: "number" },
        realtime_b_progress: { type: "number" },
        realtime_a_fixed_category: { type: "string" },
        realtime_b_fixed_category: { type: "string" },
        realtime_a_completed_categories: {
          type: "list",
          items: {
            type: "map",
            properties: {
              category: { type: "string" },
              value: { type: "number" },
            },
          },
        },
        realtime_b_completed_categories: {
          type: "list",
          items: {
            type: "map",
            properties: {
              category: { type: "string" },
              value: { type: "number" },
            },
          },
        },
        realtime_chat_messages: {
          type: "list",
          items: { type: "string" },
        },
        realtime_in_room_a: { type: "boolean" },
        realtime_in_room_b: { type: "boolean" },
        ttl: { type: "number" },
      },
      indexes: {
        primary: {
          pk: {
            field: "room_id",
            casing: "upper",
            composite: ["room_id"],
          },
        },
      },
    },
    { client, table: process.env.ROOMS_TABLE! }
  );
};

export type RoomEntity = ReturnType<typeof createRoomEntity>;
