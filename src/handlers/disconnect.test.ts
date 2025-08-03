import { describe, it, expect, vi, beforeEach } from "vitest";
import { handler } from "./disconnect";
import { ServiceFactory } from "@/services/ServiceFactory";

// Mock dependencies
vi.mock("@/lib/dynamo", () => ({
  dynamo: "mocked-dynamo-client",
}));

vi.mock("@/lib/apigw", () => ({
  apiClient: "mocked-api-client",
}));

vi.mock("@/services/ServiceFactory");

const mockConnectionService = {
  deleteConnection: vi.fn(),
};

const mockServiceFactory = {
  createConnectionService: vi.fn().mockReturnValue(mockConnectionService),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ServiceFactory).mockImplementation(() => mockServiceFactory as any);
});

describe("disconnect handler", () => {
  const createMockEvent = (connectionId = "test-connection-id") => ({
    requestContext: { connectionId },
  });

  it("desconecta correctamente con connectionId válido", async () => {
    const event = createMockEvent("connection-123");

    const result = await handler(event as any, {} as any);

    expect(mockConnectionService.deleteConnection).toHaveBeenCalledWith(
      "connection-123"
    );
    expect(result.statusCode).toBe(200);
    expect(result.body).toBe("Disconnected.");
  });

  it("maneja connectionId faltante", async () => {
    const event = {
      requestContext: {},
    };

    const result = await handler(event as any, {} as any);

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe("Missing connectionId.");
    expect(mockConnectionService.deleteConnection).not.toHaveBeenCalled();
  });

  it("maneja connectionId undefined", async () => {
    const event = {
      requestContext: { connectionId: undefined },
    };

    const result = await handler(event as any, {} as any);

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe("Missing connectionId.");
    expect(mockConnectionService.deleteConnection).not.toHaveBeenCalled();
  });

  it("maneja connectionId null", async () => {
    const event = {
      requestContext: { connectionId: null },
    };

    const result = await handler(event as any, {} as any);

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe("Missing connectionId.");
    expect(mockConnectionService.deleteConnection).not.toHaveBeenCalled();
  });

  it("maneja connectionId vacío", async () => {
    const event = createMockEvent("");

    const result = await handler(event as any, {} as any);

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe("Missing connectionId.");
    expect(mockConnectionService.deleteConnection).not.toHaveBeenCalled();
  });

  it("maneja errores al eliminar la conexión", async () => {
    const event = createMockEvent("connection-123");

    mockConnectionService.deleteConnection.mockRejectedValue(
      new Error("Database error")
    );

    const result = await handler(event as any, {} as any);

    expect(mockConnectionService.deleteConnection).toHaveBeenCalledWith(
      "connection-123"
    );
    expect(result.statusCode).toBe(500);
    expect(result.body).toBe("Failed to delete connection.");
  });

  it("funciona con diferentes tipos de connectionId", async () => {
    const testCases = [
      "simple-connection",
      "connection-with-dashes-123",
      "connectionWithCamelCase",
      "connection_with_underscores",
      "1234567890",
    ];

    for (const connectionId of testCases) {
      vi.clearAllMocks();

      // Re-setup the mock after clearing
      mockConnectionService.deleteConnection.mockResolvedValue(undefined);
      vi.mocked(ServiceFactory).mockImplementation(
        () => mockServiceFactory as any
      );

      const event = createMockEvent(connectionId);

      const result = await handler(event as any, {} as any);

      expect(mockConnectionService.deleteConnection).toHaveBeenCalledWith(
        connectionId
      );
      expect(result.statusCode).toBe(200);
      expect(result.body).toBe("Disconnected.");
    }
  });

  it("maneja errores específicos del servicio de conexión", async () => {
    const event = createMockEvent("connection-123");

    const specificErrors = [
      new Error("Connection not found"),
      new Error("DynamoDB connection error"),
      new Error("Network timeout"),
    ];

    for (const error of specificErrors) {
      vi.clearAllMocks();

      // Re-setup the mock after clearing
      mockConnectionService.deleteConnection.mockRejectedValue(error);
      vi.mocked(ServiceFactory).mockImplementation(
        () => mockServiceFactory as any
      );

      const result = await handler(event as any, {} as any);

      expect(result.statusCode).toBe(500);
      expect(result.body).toBe("Failed to delete connection.");
    }
  });
});
