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

  console.log("[connect] Success response");
  return {
    statusCode: 200,
    body: "Connected.",
  };
};
