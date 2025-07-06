import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import { ConnectionService } from "@/services/ConnectionService";
import { RoomService } from "@/services/RoomService";

export class ServiceFactory {
  constructor(
    private readonly dynamo: DynamoDBDocumentClient,
    private readonly api: ApiGatewayManagementApiClient
  ) {}

  createConnectionService() {
    return new ConnectionService(this.dynamo);
  }

  createRoomService() {
    return new RoomService(this.dynamo, this.api);
  }
}
