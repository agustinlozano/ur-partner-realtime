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
  console.log("[connect] handler invoked with ElectroDB repositories");

  const connectionId = event.requestContext.connectionId;
  const rawQueryString = (event as any).queryStringParameters || "";

  const searchParams = new URLSearchParams(rawQueryString);
  const roomId = searchParams.get("roomId") ?? "";
  const slot = searchParams.get("slot") as "a" | "b";

  console.log("[connect] extracted params", { connectionId, roomId, slot });

  if (!connectionId || !roomId || !["a", "b"].includes(slot)) {
    console.error("[connect] Missing or invalid connection params", {
      connectionId,
      roomId,
      slot,
    });
    return {
      statusCode: 400,
      body: "Missing or invalid connection params.",
    };
  }

  const factory = new ServiceFactory(dynamo, apiClient);

  // Use the new repository-based services
  const connectionService = factory.createConnectionService();
  const roomService = factory.createRoomService();

  try {
    console.log("[connect] Saving connection using repository", {
      connectionId,
      roomId,
      slot,
    });
    await connectionService.saveConnection(connectionId, roomId, slot);
    console.log("[connect] Connection saved successfully");
  } catch (err) {
    console.error("[connect] Error saving connection", err);
    return {
      statusCode: 500,
      body: "Failed to save connection.",
    };
  }

  // Update slot status (connected) in the room using repository
  try {
    await roomService.setRealtimeInRoomSlot(roomId, slot, true);
    console.log("[connect] Updated realtime presence using repository", {
      roomId,
      slot,
    });
  } catch (err) {
    console.error("[connect] Error updating room presence", err);
    // No return error, just log
  }

  console.log("[connect] Success response");
  return {
    statusCode: 200,
    body: "Connected via ElectroDB repositories.",
  };
};
