import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";

export const apiClient = new ApiGatewayManagementApiClient({
  endpoint: process.env.IS_OFFLINE ? "http://localhost:3001" : undefined,
  region: process.env.AWS_REGION || "us-east-2",
});
