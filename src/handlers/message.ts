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
  console.log("[message] handler invoked", { eventBody: event.body });
  const connectionId = event.requestContext.connectionId;
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    console.error("[message] Error parsing body", err);
    return {
      statusCode: 400,
      body: "Invalid JSON body.",
    };
  }
  console.log("[message] extracted params", { connectionId, body });

  if (!connectionId) {
    console.error("[message] Missing connectionId", { connectionId });
    return {
      statusCode: 400,
      body: "Missing connectionId.",
    };
  }

  const factory = new ServiceFactory(dynamo, apiClient);
  const roomService = factory.createRoomService();

  try {
    console.log("[message] Processing message", { connectionId, body });
    if (body.type === "get_in" || body.type === "leave") {
      if (body.type === "leave") {
        await roomService.setRealtimeInRoomSlot(body.roomId, body.slot, false);
      }
      await roomService.broadcastToRoom(body.roomId, body, connectionId);
    } else if (body.type === "category_fixed") {
      await roomService.fixCategory(body.roomId, body.slot, body.category);
      await roomService.broadcastToRoom(body.roomId, body, connectionId);
    } else if (body.type === "category_completed") {
      await roomService.addCompletedCategory(
        body.roomId,
        body.slot,
        body.category
      );
      await roomService.broadcastToRoom(body.roomId, body, connectionId);
    } else if (body.type === "is_ready") {
      await roomService.setReady(body.roomId, body.slot);
      await roomService.broadcastToRoom(body.roomId, body, connectionId);
    } else {
      await roomService.broadcastToRoom(body.roomId, body);
    }
    console.log("[message] Message processed successfully");
  } catch (err) {
    console.error("[message] Error processing message", err);
    return {
      statusCode: 500,
      body: "Failed to process message.",
    };
  }

  console.log("[message] Success response");
  return {
    statusCode: 200,
    body: "Message processed.",
  };
};
