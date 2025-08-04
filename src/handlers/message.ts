import {
  APIGatewayEventRequestContextV2,
  APIGatewayProxyWebsocketEventV2,
} from "aws-lambda";
import { ServiceFactory } from "@/services/ServiceFactory";
import { dynamo } from "@/lib/dynamo";
import { apiClient } from "@/lib/apigw";
import { routeMessage } from "./message.router";

export const handler = async (
  event: APIGatewayProxyWebsocketEventV2,
  context: APIGatewayEventRequestContextV2
) => {
  const connectionId = event.requestContext.connectionId;
  if (!connectionId) {
    console.error("[message] Missing connectionId");
    return { statusCode: 400, body: "Missing connectionId." };
  }

  let body: any;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    console.error("[message] Invalid JSON", err);
    return { statusCode: 400, body: "Invalid JSON body." };
  }

  const factory = new ServiceFactory(dynamo, apiClient);
  const roomService = factory.createRoomService();

  try {
    await routeMessage({ body, connectionId, roomService });
    return { statusCode: 200, body: "Message processed." };
  } catch (err) {
    console.error("[message] Failed", err);
    return { statusCode: 500, body: "Failed to process message." };
  }
};
