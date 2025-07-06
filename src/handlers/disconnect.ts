import {
  APIGatewayEventRequestContextV2,
  APIGatewayProxyWebsocketEventV2,
} from "aws-lambda";
import { ServiceFactory } from "@/services/ServiceFactory";
import { dynamo } from "@/lib/dynamo";
import { apiClient } from "@/lib/apigw";

export const handler = async (
  event: APIGatewayProxyWebsocketEventV2,
  context: APIGatewayEventRequestContextV2
) => {
  console.log("[disconnect] handler invoked", { event, context });
  const connectionId = event.requestContext.connectionId;
  console.log("[disconnect] extracted connectionId", { connectionId });

  if (!connectionId) {
    console.error("[disconnect] Missing connectionId", { connectionId });
    return {
      statusCode: 400,
      body: "Missing connectionId.",
    };
  }

  const factory = new ServiceFactory(dynamo, apiClient);
  const connectionService = factory.createConnectionService();

  try {
    console.log("[disconnect] Deleting connection", { connectionId });
    await connectionService.deleteConnection(connectionId);
    console.log("[disconnect] Connection deleted successfully");
  } catch (err) {
    console.error("[disconnect] Error deleting connection", err);
    return {
      statusCode: 500,
      body: "Failed to delete connection.",
    };
  }

  console.log("[disconnect] Success response");
  return {
    statusCode: 200,
    body: "Disconnected.",
  };
};
