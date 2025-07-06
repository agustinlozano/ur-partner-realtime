import {
  DynamoDBDocumentClient,
  PutCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

export class ConnectionService {
  constructor(private readonly dynamo: DynamoDBDocumentClient) {}

  async saveConnection(connectionId: string, roomId: string, slot: "a" | "b") {
    await this.dynamo.send(
      new PutCommand({
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
