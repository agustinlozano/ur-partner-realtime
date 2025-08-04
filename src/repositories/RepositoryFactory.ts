import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { ConnectionRepository } from "./ConnectionRepository";
import { RoomRepository } from "./RoomRepository";

export class RepositoryFactory {
  constructor(private readonly dynamo: DynamoDBDocumentClient) {}

  createConnectionRepository(): ConnectionRepository {
    return new ConnectionRepository(this.dynamo);
  }

  createRoomRepository(): RoomRepository {
    return new RoomRepository(this.dynamo);
  }
}
