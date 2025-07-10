import {
  DynamoDBDocumentClient,
  PutCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

export class ConnectionService {
  constructor(private readonly dynamo: DynamoDBDocumentClient) {}

  async saveConnection(connectionId: string, roomId: string, slot: "a" | "b") {
    // Buscar si ya existe una conexión para este roomId y slot
    const result = await this.dynamo.send(
      new (require("@aws-sdk/lib-dynamodb").QueryCommand)({
        TableName: process.env.CONNECTIONS_TABLE,
        IndexName: "roomId-index",
        KeyConditionExpression: "roomId = :roomId",
        FilterExpression: "slot = :slot",
        ExpressionAttributeValues: { ":roomId": roomId, ":slot": slot },
      })
    );
    // @ts-ignore
    const existing = result.Items?.[0];
    if (
      existing &&
      existing.connectionId &&
      existing.connectionId !== connectionId
    ) {
      // Borrar la conexión anterior
      await this.dynamo.send(
        new (require("@aws-sdk/lib-dynamodb").DeleteCommand)({
          TableName: process.env.CONNECTIONS_TABLE,
          Key: { connectionId: existing.connectionId },
        })
      );
      console.log(
        `[ConnectionService] Deleted previous connection for roomId=${roomId} slot=${slot}:`,
        existing.connectionId
      );
    }
    // Guardar la nueva conexión
    await this.dynamo.send(
      new (require("@aws-sdk/lib-dynamodb").PutCommand)({
        TableName: process.env.CONNECTIONS_TABLE,
        Item: { connectionId, roomId, slot },
      })
    );
  }

  async deleteConnection(connectionId: string) {
    await this.dynamo.send(
      new DeleteCommand({
        TableName: process.env.CONNECTIONS_TABLE,
        Key: { connectionId },
      })
    );
  }
}
