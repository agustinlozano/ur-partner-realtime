import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";

const getEndpoint = () => {
  if (process.env.IS_OFFLINE) {
    return "http://localhost:3001";
  }

  if (process.env.WEBSOCKET_API_ENDPOINT) {
    return process.env.WEBSOCKET_API_ENDPOINT;
  }

  // Fallback: esto no debería usarse en producción
  console.warn(
    "No WEBSOCKET_API_ENDPOINT found, this might cause issues in production"
  );
  return undefined;
};

export const apiClient = new ApiGatewayManagementApiClient({
  endpoint: getEndpoint(),
  region: process.env.AWS_REGION || "us-east-2",
});
