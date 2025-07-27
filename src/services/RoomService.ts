import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { RoomEvent } from "@/types/RoomEvent";

export class RoomService {
  constructor(
    private readonly dynamo: DynamoDBDocumentClient,
    private readonly api: ApiGatewayManagementApiClient
  ) {}

  async broadcastToRoom(
    roomId: string,
    event: RoomEvent,
    excludeConnectionId?: string
  ) {
    console.log("[broadcastToRoom] QueryCommand params", {
      TableName: process.env.CONNECTIONS_TABLE,
      IndexName: "roomId-index",
      KeyConditionExpression: "roomId = :roomId",
      ExpressionAttributeValues: { ":roomId": roomId },
    });

    const result = await this.dynamo.send(
      new QueryCommand({
        TableName: process.env.CONNECTIONS_TABLE,
        IndexName: "roomId-index",
        KeyConditionExpression: "roomId = :roomId",
        ExpressionAttributeValues: { ":roomId": roomId },
      })
    );

    let connections = result.Items ?? [];
    console.log("[broadcastToRoom] connections", connections);
    if (excludeConnectionId) {
      connections = connections.filter(
        ({ connectionId }) => connectionId !== excludeConnectionId
      );
    }

    console.log("[broadcastToRoom] Broadcasting to connections", {
      connections,
      event,
    });

    await Promise.all(
      connections.map(async ({ connectionId }) =>
        this.api
          .send(
            new PostToConnectionCommand({
              ConnectionId: connectionId,
              Data: Buffer.from(JSON.stringify(event)),
            })
          )
          .catch(async (err) => {
            if (err.statusCode === 410) {
              console.log("Stale connection", connectionId);
              // Limpiar de la tabla Connections
              try {
                await this.dynamo.send(
                  new (require("@aws-sdk/lib-dynamodb").DeleteCommand)({
                    TableName: process.env.CONNECTIONS_TABLE,
                    Key: { connectionId },
                  })
                );
                console.log("Deleted stale connection from DB", connectionId);
              } catch (e) {
                console.error(
                  "Error deleting stale connection",
                  connectionId,
                  e
                );
              }
            } else {
              console.error("Error posting to connection", err);
            }
          })
      )
    );
  }

  async addCompletedCategory(
    roomId: string,
    slot: "a" | "b",
    category: string
  ) {
    const fieldName = `realtime_${slot}_completed_categories`;
    try {
      const getResp = (await this.dynamo.send(
        new (require("@aws-sdk/lib-dynamodb").GetCommand)({
          TableName: process.env.ROOMS_TABLE,
          Key: { room_id: roomId },
          ProjectionExpression: fieldName,
        })
      )) as { Item?: Record<string, any> };
      let categoriesArr =
        (getResp && getResp.Item && getResp.Item[fieldName]) || [];
      if (!Array.isArray(categoriesArr)) categoriesArr = [];
      // Check if category already exists
      const exists = categoriesArr.some(
        (item: any) => item.category === category
      );
      if (!exists) {
        categoriesArr.push({ category, value: Date.now() });
        await this.dynamo.send(
          new (require("@aws-sdk/lib-dynamodb").UpdateCommand)({
            TableName: process.env.ROOMS_TABLE,
            Key: { room_id: roomId },
            UpdateExpression: `SET #field = :val`,
            ExpressionAttributeNames: { "#field": fieldName },
            ExpressionAttributeValues: { ":val": categoriesArr },
          })
        );
        console.log(`[RoomService] Updated ${fieldName} in Rooms table`, {
          roomId,
          categoriesArr,
        });
      } else {
        console.log(`[RoomService] Category already present in ${fieldName}`, {
          roomId,
          category,
        });
      }
    } catch (err) {
      console.error("[RoomService] Error updating completed categories", err);
    }
  }

  async setRealtimeInRoomSlot(roomId: string, slot: "a" | "b", value: boolean) {
    const fieldName = `realtime_in_room_${slot}`;
    try {
      await this.dynamo.send(
        new (require("@aws-sdk/lib-dynamodb").UpdateCommand)({
          TableName: process.env.ROOMS_TABLE,
          Key: { room_id: roomId },
          UpdateExpression: `SET #field = :val`,
          ExpressionAttributeNames: { "#field": fieldName },
          ExpressionAttributeValues: { ":val": value },
        })
      );
      console.log(
        `[RoomService] Updated ${fieldName} to ${value} in Rooms table`,
        { roomId }
      );
    } catch (err) {
      console.error(
        `[RoomService] Error updating presence for ${fieldName}`,
        err
      );
    }
  }

  async fixCategory(roomId: string, slot: "a" | "b", category: string) {
    const fieldName = `realtime_${slot}_fixed_category`;
    try {
      await this.dynamo.send(
        new (require("@aws-sdk/lib-dynamodb").UpdateCommand)({
          TableName: process.env.ROOMS_TABLE,
          Key: { room_id: roomId },
          UpdateExpression: `SET #field = :val`,
          ExpressionAttributeNames: { "#field": fieldName },
          ExpressionAttributeValues: { ":val": category },
        })
      );
      console.log(
        `[RoomService] Updated ${fieldName} to ${category} in Rooms table`,
        { roomId }
      );
    } catch (err) {
      console.error(
        `[RoomService] Error updating fixed category for ${fieldName}`,
        err
      );
    }
  }

  async setReady(roomId: string, slot: "a" | "b") {
    const fieldName = `realtime_${slot}_ready`;
    try {
      await this.dynamo.send(
        new (require("@aws-sdk/lib-dynamodb").UpdateCommand)({
          TableName: process.env.ROOMS_TABLE,
          Key: { room_id: roomId },
          UpdateExpression: `SET #field = :val`,
          ExpressionAttributeNames: { "#field": fieldName },
          ExpressionAttributeValues: { ":val": true },
        })
      );
      console.log(`[RoomService] Updated ${fieldName} to true in Rooms table`, {
        roomId,
      });
    } catch (err) {
      console.error(`[RoomService] Error updating ready for ${fieldName}`, err);
    }
  }
}
