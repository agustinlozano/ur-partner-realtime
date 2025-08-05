import { Entity } from "electrodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export interface ConnectionItem {
  connectionId: string;
  roomId: string;
  slot: "a" | "b";
  createdAt?: string;
}

export const createConnectionEntity = (client: DynamoDBDocumentClient) => {
  return new Entity(
    {
      model: {
        entity: "Connection",
        version: "1",
        service: "urpartner",
      },
      attributes: {
        connectionId: {
          type: "string",
          required: true,
        },
        roomId: {
          type: "string",
          required: true,
        },
        slot: {
          type: ["a", "b"] as const,
          required: true,
        },
        createdAt: {
          type: "string",
          default: () => new Date().toISOString(),
        },
      },
      indexes: {
        primary: {
          pk: {
            field: "connectionId",
            casing: "none", // Keep connectionId as-is (UUIDs)
            composite: ["connectionId"],
          },
        },
        byRoom: {
          index: "roomId-index",
          pk: {
            field: "roomId",
            casing: "upper", // Ensure roomId is uppercase to match Room entity
            composite: ["roomId"],
          },
        },
      },
    },
    { client, table: process.env.CONNECTIONS_TABLE! }
  );
};

export type ConnectionEntity = ReturnType<typeof createConnectionEntity>;
