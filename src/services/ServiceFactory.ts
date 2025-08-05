import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import { ConnectionService } from "@/services/ConnectionService";
import { RoomService } from "@/services/RoomService";
import { RepositoryFactory } from "@/repositories/RepositoryFactory";

export class ServiceFactory {
  private repositoryFactory: RepositoryFactory;

  constructor(
    private readonly dynamo: DynamoDBDocumentClient,
    private readonly api: ApiGatewayManagementApiClient
  ) {
    this.repositoryFactory = new RepositoryFactory(dynamo);
  }

  createConnectionService() {
    const connectionRepository =
      this.repositoryFactory.createConnectionRepository();
    return new ConnectionService(connectionRepository);
  }

  createRoomService() {
    const roomRepository = this.repositoryFactory.createRoomRepository();
    const connectionRepository =
      this.repositoryFactory.createConnectionRepository();
    return new RoomService(roomRepository, connectionRepository, this.api);
  }

  // Direct repository access if needed
  getRepositoryFactory() {
    return this.repositoryFactory;
  }
}
