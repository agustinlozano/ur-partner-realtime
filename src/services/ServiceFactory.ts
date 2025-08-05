import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import { ConnectionService } from "@/services/ConnectionService";
import { RoomService } from "@/services/RoomService";

import { ConnectionServiceV2 } from "@/services/ConnectionServiceV2";
import { RoomServiceV2 } from "@/services/RoomServiceV2";
import { RepositoryFactory } from "@/repositories/RepositoryFactory";

export class ServiceFactory {
  private repositoryFactory: RepositoryFactory;

  constructor(
    private readonly dynamo: DynamoDBDocumentClient,
    private readonly api: ApiGatewayManagementApiClient
  ) {
    this.repositoryFactory = new RepositoryFactory(dynamo);
  }

  // @aws-sdk/dynamodb based
  createConnectionServiceOld() {
    return new ConnectionService(this.dynamo);
  }

  // @aws-sdk/dynamodb based
  createRoomServiceOld() {
    return new RoomService(this.dynamo, this.api);
  }

  createConnectionService() {
    const connectionRepository =
      this.repositoryFactory.createConnectionRepository();
    return new ConnectionServiceV2(connectionRepository);
  }

  createRoomService() {
    const roomRepository = this.repositoryFactory.createRoomRepository();
    const connectionRepository =
      this.repositoryFactory.createConnectionRepository();
    return new RoomServiceV2(roomRepository, connectionRepository, this.api);
  }

  // Direct repository access if needed
  getRepositoryFactory() {
    return this.repositoryFactory;
  }
}
