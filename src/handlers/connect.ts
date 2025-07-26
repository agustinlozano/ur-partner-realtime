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
  // console.log("\n\n[connect] handler invoked", { event, context });
  
  // Log para debug de variables de entorno
  console.log("[connect] Environment variables:", {
    CONNECTIONS_TABLE: process.env.CONNECTIONS_TABLE,
    ROOMS_TABLE: process.env.ROOMS_TABLE,
    WEBSOCKET_API_ENDPOINT: process.env.WEBSOCKET_API_ENDPOINT,
    AWS_REGION: process.env.AWS_REGION,
    IS_OFFLINE: process.env.IS_OFFLINE
  });
  
  const connectionId = event.requestContext.connectionId;

  const rawQueryString = (event as any).queryStringParameters || "";

  console.log("[connect] rawQueryString", rawQueryString);

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
  const connectionService = factory.createConnectionService();

  try {
    console.log("[connect] Saving connection", { connectionId, roomId, slot });
    await connectionService.saveConnection(connectionId, roomId, slot);
    console.log("[connect] Connection saved successfully");
  } catch (err) {
    console.error("[connect] Error saving connection", err);
    return {
      statusCode: 500,
      body: "Failed to save connection.",
    };
  }

  // Update slot status (connected) in the room
  try {
    const fieldName = `realtime_in_room_${slot}`;
    await dynamo.send(
      new (require("@aws-sdk/lib-dynamodb").UpdateCommand)({
        TableName: process.env.ROOMS_TABLE,
        Key: { room_id: roomId },
        UpdateExpression: `SET #field = :val`,
        ExpressionAttributeNames: { "#field": fieldName },
        ExpressionAttributeValues: { ":val": true },
      })
    );
    console.log("[connect] Updated", fieldName, "in Rooms table", { roomId });
  } catch (err) {
    console.error("[connect] Error updating Rooms table", err);
    // No return error, just log
  }

  console.log("[connect] Success response");
  return {
    statusCode: 200,
    body: "Connected.",
  };
};
