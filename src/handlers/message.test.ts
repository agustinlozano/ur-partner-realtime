import { describe, it, expect, vi, beforeEach } from "vitest";
import { handler } from "./message";
import { ServiceFactory } from "@/services/ServiceFactory";

// Mock dependencies
vi.mock("@/lib/dynamo", () => ({
  dynamo: "mocked-dynamo-client",
}));

vi.mock("@/lib/apigw", () => ({
  apiClient: "mocked-api-client",
}));

vi.mock("@/services/ServiceFactory");

const mockRoomService = {
  broadcastToRoom: vi.fn(),
  setRealtimeInRoomSlot: vi.fn(),
  fixCategory: vi.fn(),
  addCompletedCategory: vi.fn(),
  removeCompletedCategory: vi.fn(),
  setReady: vi.fn(),
};

const mockServiceFactory = {
  createRoomService: vi.fn().mockReturnValue(mockRoomService),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ServiceFactory).mockImplementation(() => mockServiceFactory as any);
});

describe("message handler", () => {
  const createMockEvent = (body: any, connectionId = "test-connection-id") => ({
    requestContext: { connectionId },
    body: JSON.stringify(body),
  });

  it("maneja evento get_in correctamente", async () => {
    const event = createMockEvent({
      type: "get_in",
      roomId: "room1",
      slot: "a",
    });

    const result = await handler(event as any, {} as any);

    expect(mockRoomService.broadcastToRoom).toHaveBeenCalledWith(
      "room1",
      { type: "get_in", roomId: "room1", slot: "a" },
      "test-connection-id"
    );
    expect(result.statusCode).toBe(200);
    expect(result.body).toBe("Message processed.");
  });

  it("maneja evento leave correctamente", async () => {
    const event = createMockEvent({
      type: "leave",
      roomId: "room1",
      slot: "a",
    });

    const result = await handler(event as any, {} as any);

    expect(mockRoomService.setRealtimeInRoomSlot).toHaveBeenCalledWith(
      "room1",
      "a",
      false
    );
    expect(mockRoomService.broadcastToRoom).toHaveBeenCalledWith(
      "room1",
      { type: "leave", roomId: "room1", slot: "a" },
      "test-connection-id"
    );
    expect(result.statusCode).toBe(200);
  });

  it("maneja evento category_fixed correctamente", async () => {
    const event = createMockEvent({
      type: "category_fixed",
      roomId: "room1",
      slot: "a",
      category: "animals",
    });

    const result = await handler(event as any, {} as any);

    expect(mockRoomService.fixCategory).toHaveBeenCalledWith(
      "room1",
      "a",
      "animals"
    );
    expect(mockRoomService.broadcastToRoom).toHaveBeenCalledWith(
      "room1",
      {
        type: "category_fixed",
        roomId: "room1",
        slot: "a",
        category: "animals",
      },
      "test-connection-id"
    );
    expect(result.statusCode).toBe(200);
  });

  it("maneja evento category_completed correctamente", async () => {
    const event = createMockEvent({
      type: "category_completed",
      roomId: "room1",
      slot: "b",
      category: "places",
    });

    const result = await handler(event as any, {} as any);

    expect(mockRoomService.addCompletedCategory).toHaveBeenCalledWith(
      "room1",
      "b",
      "places"
    );
    expect(mockRoomService.broadcastToRoom).toHaveBeenCalledWith(
      "room1",
      {
        type: "category_completed",
        roomId: "room1",
        slot: "b",
        category: "places",
      },
      "test-connection-id"
    );
    expect(result.statusCode).toBe(200);
  });

  it("maneja evento category_uncompleted correctamente", async () => {
    const event = createMockEvent({
      type: "category_uncompleted",
      roomId: "room1",
      slot: "a",
      category: "animals",
    });

    const result = await handler(event as any, {} as any);

    expect(mockRoomService.removeCompletedCategory).toHaveBeenCalledWith(
      "room1",
      "a",
      "animals"
    );
    expect(mockRoomService.broadcastToRoom).toHaveBeenCalledWith(
      "room1",
      {
        type: "category_uncompleted",
        roomId: "room1",
        slot: "a",
        category: "animals",
      },
      "test-connection-id"
    );
    expect(result.statusCode).toBe(200);
  });

  it("maneja evento is_ready correctamente", async () => {
    const event = createMockEvent({
      type: "is_ready",
      roomId: "room1",
      slot: "b",
    });

    const result = await handler(event as any, {} as any);

    expect(mockRoomService.setReady).toHaveBeenCalledWith("room1", "b");
    expect(mockRoomService.broadcastToRoom).toHaveBeenCalledWith(
      "room1",
      { type: "is_ready", roomId: "room1", slot: "b" },
      "test-connection-id"
    );
    expect(result.statusCode).toBe(200);
  });

  it("maneja evento say correctamente", async () => {
    const event = createMockEvent({
      type: "say",
      roomId: "room1",
      slot: "a",
      message: "Hola mundo",
    });

    const result = await handler(event as any, {} as any);

    expect(mockRoomService.broadcastToRoom).toHaveBeenCalledWith(
      "room1",
      { type: "say", roomId: "room1", slot: "a", message: "Hola mundo" },
      "test-connection-id"
    );
    expect(result.statusCode).toBe(200);
  });

  it("maneja eventos desconocidos enviándolos a todos", async () => {
    const event = createMockEvent({
      type: "unknown_event",
      roomId: "room1",
      slot: "a",
      customData: "test",
    });

    const result = await handler(event as any, {} as any);

    expect(mockRoomService.broadcastToRoom).toHaveBeenCalledWith(
      "room1",
      { type: "unknown_event", roomId: "room1", slot: "a", customData: "test" }
      // Note: no excludeConnectionId for unknown events
    );
    expect(result.statusCode).toBe(200);
  });

  it("maneja JSON inválido", async () => {
    const event = {
      requestContext: { connectionId: "test-connection-id" },
      body: "invalid json{",
    };

    const result = await handler(event as any, {} as any);

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe("Invalid JSON body.");
    expect(mockRoomService.broadcastToRoom).not.toHaveBeenCalled();
  });

  it("maneja connectionId faltante", async () => {
    const event = {
      requestContext: {},
      body: JSON.stringify({ type: "get_in", roomId: "room1", slot: "a" }),
    };

    const result = await handler(event as any, {} as any);

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe("Missing connectionId.");
    expect(mockRoomService.broadcastToRoom).not.toHaveBeenCalled();
  });

  it("maneja body vacío", async () => {
    const event = {
      requestContext: { connectionId: "test-connection-id" },
      body: null,
    };

    const result = await handler(event as any, {} as any);

    expect(mockRoomService.broadcastToRoom).toHaveBeenCalledWith(
      undefined,
      {}
      // broadcasts empty object for unknown event type
    );
    expect(result.statusCode).toBe(200);
  });

  it("maneja errores en el procesamiento", async () => {
    const event = createMockEvent({
      type: "category_fixed",
      roomId: "room1",
      slot: "a",
      category: "animals",
    });

    mockRoomService.fixCategory.mockRejectedValue(new Error("Database error"));

    const result = await handler(event as any, {} as any);

    expect(result.statusCode).toBe(500);
    expect(result.body).toBe("Failed to process message.");
  });

  it("maneja eventos ping correctamente", async () => {
    const event = createMockEvent({
      type: "ping",
      roomId: "room1",
      slot: "a",
    });

    const result = await handler(event as any, {} as any);

    // Ping events should be broadcasted to all (no excludeConnectionId)
    expect(mockRoomService.broadcastToRoom).toHaveBeenCalledWith("room1", {
      type: "ping",
      roomId: "room1",
      slot: "a",
    });
    expect(result.statusCode).toBe(200);
  });

  it("maneja eventos progress_updated correctamente", async () => {
    const event = createMockEvent({
      type: "progress_updated",
      roomId: "room1",
      slot: "b",
      progress: 75,
    });

    const result = await handler(event as any, {} as any);

    // Progress events should be broadcasted to all (no excludeConnectionId)
    expect(mockRoomService.broadcastToRoom).toHaveBeenCalledWith("room1", {
      type: "progress_updated",
      roomId: "room1",
      slot: "b",
      progress: 75,
    });
    expect(result.statusCode).toBe(200);
  });
});
