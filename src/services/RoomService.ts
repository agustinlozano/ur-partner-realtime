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
      connections.map(({ connectionId }) =>
        this.api
          .send(
            new PostToConnectionCommand({
              ConnectionId: connectionId,
              Data: Buffer.from(JSON.stringify(event)),
            })
          )
          .catch((err) => {
            if (err.statusCode === 410) {
              console.log("Stale connection", connectionId);
            } else {
              console.error("Error posting to connection", err);
            }
          })
      )
    );
  }
}
