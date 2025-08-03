import { describe, it, expect, vi, beforeEach } from "vitest";
import { RoomService } from "./RoomService";

const mockSend = vi.fn().mockResolvedValue({});
const mockApi = { send: mockSend };
const mockDynamo = { send: vi.fn() };

// Mock environment variables
process.env.CONNECTIONS_TABLE = "connections-table";
process.env.ROOMS_TABLE = "rooms-table";

describe("RoomService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("broadcastToRoom", () => {
    it("no envía el evento al emisor (excludeConnectionId)", async () => {
      mockDynamo.send.mockResolvedValue({
        Items: [
          { connectionId: "A", roomId: "room1", slot: "a" },
          { connectionId: "B", roomId: "room1", slot: "b" },
        ],
      });

      const service = new RoomService(mockDynamo as any, mockApi as any);

      await service.broadcastToRoom(
        "room1",
        { type: "get_in", slot: "a" },
        "A"
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0][0].input.ConnectionId).toBe("B");
    });

    it("envía a todos si no se excluye a nadie", async () => {
      mockDynamo.send.mockResolvedValue({
        Items: [
          { connectionId: "A", roomId: "room1", slot: "a" },
          { connectionId: "B", roomId: "room1", slot: "b" },
        ],
      });

      const service = new RoomService(mockDynamo as any, mockApi as any);

      await service.broadcastToRoom("room1", {
        type: "get_in",
        slot: "a",
      });

      expect(mockSend).toHaveBeenCalledTimes(2);
      const ids = mockSend.mock.calls.map((call) => call[0].input.ConnectionId);
      expect(ids).toContain("A");
      expect(ids).toContain("B");
    });

    it("maneja conexiones obsoletas (statusCode 410)", async () => {
      mockDynamo.send.mockResolvedValueOnce({
        Items: [
          { connectionId: "stale-connection", roomId: "room1", slot: "a" },
        ],
      });

      mockSend.mockRejectedValueOnce({ statusCode: 410 });
      mockDynamo.send.mockResolvedValueOnce({}); // For delete command

      const service = new RoomService(mockDynamo as any, mockApi as any);

      await service.broadcastToRoom("room1", { type: "ping", slot: "a" });

      // Should call dynamo twice: once for query, once for delete
      expect(mockDynamo.send).toHaveBeenCalledTimes(2);
      expect(mockDynamo.send.mock.calls[1][0].input.Key).toEqual({
        connectionId: "stale-connection",
      });
    });

    it("maneja errores de conexión que no son 410", async () => {
      mockDynamo.send.mockResolvedValue({
        Items: [{ connectionId: "A", roomId: "room1", slot: "a" }],
      });

      mockSend.mockRejectedValueOnce({
        statusCode: 500,
        message: "Server error",
      });

      const service = new RoomService(mockDynamo as any, mockApi as any);

      // Should not throw error
      await expect(
        service.broadcastToRoom("room1", { type: "ping", slot: "a" })
      ).resolves.not.toThrow();
    });
  });

  describe("addCompletedCategory", () => {
    it("agrega una nueva categoría completada", async () => {
      mockDynamo.send
        .mockResolvedValueOnce({
          Item: { realtime_a_completed_categories: [] },
        })
        .mockResolvedValueOnce({});

      const service = new RoomService(mockDynamo as any, mockApi as any);

      await service.addCompletedCategory("room1", "a", "animals");

      expect(mockDynamo.send).toHaveBeenCalledTimes(2);
      const updateCall = mockDynamo.send.mock.calls[1][0];
      expect(updateCall.input.UpdateExpression).toBe("SET #field = :val");
      expect(updateCall.input.ExpressionAttributeNames).toEqual({
        "#field": "realtime_a_completed_categories",
      });
      expect(updateCall.input.ExpressionAttributeValues[":val"]).toHaveLength(
        1
      );
      expect(
        updateCall.input.ExpressionAttributeValues[":val"][0].category
      ).toBe("animals");
    });

    it("no agrega categoría si ya existe", async () => {
      mockDynamo.send.mockResolvedValueOnce({
        Item: {
          realtime_a_completed_categories: [
            { category: "animals", value: 123456789 },
          ],
        },
      });

      const service = new RoomService(mockDynamo as any, mockApi as any);

      await service.addCompletedCategory("room1", "a", "animals");

      // Should only call GET, not UPDATE
      expect(mockDynamo.send).toHaveBeenCalledTimes(1);
    });

    it("inicializa array vacío si el campo no existe", async () => {
      mockDynamo.send
        .mockResolvedValueOnce({ Item: {} })
        .mockResolvedValueOnce({});

      const service = new RoomService(mockDynamo as any, mockApi as any);

      await service.addCompletedCategory("room1", "b", "places");

      const updateCall = mockDynamo.send.mock.calls[1][0];
      expect(updateCall.input.ExpressionAttributeValues[":val"]).toHaveLength(
        1
      );
    });

    it("maneja errores gracefully", async () => {
      mockDynamo.send.mockRejectedValue(new Error("DynamoDB error"));

      const service = new RoomService(mockDynamo as any, mockApi as any);

      // Should not throw
      await expect(
        service.addCompletedCategory("room1", "a", "animals")
      ).resolves.not.toThrow();
    });
  });

  describe("removeCompletedCategory", () => {
    it("remueve una categoría completada existente", async () => {
      mockDynamo.send
        .mockResolvedValueOnce({
          Item: {
            realtime_a_completed_categories: [
              { category: "animals", value: 123456789 },
              { category: "places", value: 987654321 },
            ],
          },
        })
        .mockResolvedValueOnce({});

      const service = new RoomService(mockDynamo as any, mockApi as any);

      await service.removeCompletedCategory("room1", "a", "animals");

      expect(mockDynamo.send).toHaveBeenCalledTimes(2);
      const updateCall = mockDynamo.send.mock.calls[1][0];
      expect(updateCall.input.ExpressionAttributeValues[":val"]).toHaveLength(
        1
      );
      expect(
        updateCall.input.ExpressionAttributeValues[":val"][0].category
      ).toBe("places");
    });

    it("no hace nada si la categoría no existe", async () => {
      mockDynamo.send.mockResolvedValueOnce({
        Item: {
          realtime_a_completed_categories: [
            { category: "places", value: 987654321 },
          ],
        },
      });

      const service = new RoomService(mockDynamo as any, mockApi as any);

      await service.removeCompletedCategory("room1", "a", "animals");

      // Should only call GET, not UPDATE
      expect(mockDynamo.send).toHaveBeenCalledTimes(1);
    });

    it("maneja array vacío", async () => {
      mockDynamo.send.mockResolvedValueOnce({
        Item: { realtime_a_completed_categories: [] },
      });

      const service = new RoomService(mockDynamo as any, mockApi as any);

      await service.removeCompletedCategory("room1", "a", "animals");

      // Should only call GET, not UPDATE
      expect(mockDynamo.send).toHaveBeenCalledTimes(1);
    });

    it("inicializa array vacío si el campo no existe", async () => {
      mockDynamo.send.mockResolvedValueOnce({ Item: {} });

      const service = new RoomService(mockDynamo as any, mockApi as any);

      await service.removeCompletedCategory("room1", "b", "animals");

      // Should only call GET, not UPDATE since array is empty
      expect(mockDynamo.send).toHaveBeenCalledTimes(1);
    });

    it("maneja errores gracefully", async () => {
      mockDynamo.send.mockRejectedValue(new Error("DynamoDB error"));

      const service = new RoomService(mockDynamo as any, mockApi as any);

      // Should not throw
      await expect(
        service.removeCompletedCategory("room1", "a", "animals")
      ).resolves.not.toThrow();
    });
  });

  describe("setRealtimeInRoomSlot", () => {
    it("actualiza el estado de presencia en la sala", async () => {
      mockDynamo.send.mockResolvedValue({});

      const service = new RoomService(mockDynamo as any, mockApi as any);

      await service.setRealtimeInRoomSlot("room1", "a", true);

      expect(mockDynamo.send).toHaveBeenCalledTimes(1);
      const updateCall = mockDynamo.send.mock.calls[0][0];
      expect(updateCall.input.UpdateExpression).toBe("SET #field = :val");
      expect(updateCall.input.ExpressionAttributeNames).toEqual({
        "#field": "realtime_in_room_a",
      });
      expect(updateCall.input.ExpressionAttributeValues).toEqual({
        ":val": true,
      });
    });

    it("funciona para slot b", async () => {
      mockDynamo.send.mockResolvedValue({});

      const service = new RoomService(mockDynamo as any, mockApi as any);

      await service.setRealtimeInRoomSlot("room1", "b", false);

      const updateCall = mockDynamo.send.mock.calls[0][0];
      expect(updateCall.input.ExpressionAttributeNames).toEqual({
        "#field": "realtime_in_room_b",
      });
      expect(updateCall.input.ExpressionAttributeValues).toEqual({
        ":val": false,
      });
    });

    it("maneja errores gracefully", async () => {
      mockDynamo.send.mockRejectedValue(new Error("DynamoDB error"));

      const service = new RoomService(mockDynamo as any, mockApi as any);

      // Should not throw
      await expect(
        service.setRealtimeInRoomSlot("room1", "a", true)
      ).resolves.not.toThrow();
    });
  });

  describe("fixCategory", () => {
    it("fija una categoría para un slot", async () => {
      mockDynamo.send.mockResolvedValue({});

      const service = new RoomService(mockDynamo as any, mockApi as any);

      await service.fixCategory("room1", "a", "animals");

      expect(mockDynamo.send).toHaveBeenCalledTimes(1);
      const updateCall = mockDynamo.send.mock.calls[0][0];
      expect(updateCall.input.UpdateExpression).toBe("SET #field = :val");
      expect(updateCall.input.ExpressionAttributeNames).toEqual({
        "#field": "realtime_a_fixed_category",
      });
      expect(updateCall.input.ExpressionAttributeValues).toEqual({
        ":val": "animals",
      });
    });

    it("funciona para slot b", async () => {
      mockDynamo.send.mockResolvedValue({});

      const service = new RoomService(mockDynamo as any, mockApi as any);

      await service.fixCategory("room1", "b", "places");

      const updateCall = mockDynamo.send.mock.calls[0][0];
      expect(updateCall.input.ExpressionAttributeNames).toEqual({
        "#field": "realtime_b_fixed_category",
      });
      expect(updateCall.input.ExpressionAttributeValues).toEqual({
        ":val": "places",
      });
    });

    it("maneja errores gracefully", async () => {
      mockDynamo.send.mockRejectedValue(new Error("DynamoDB error"));

      const service = new RoomService(mockDynamo as any, mockApi as any);

      // Should not throw
      await expect(
        service.fixCategory("room1", "a", "animals")
      ).resolves.not.toThrow();
    });
  });

  describe("setReady", () => {
    it("marca un slot como listo", async () => {
      mockDynamo.send.mockResolvedValue({});

      const service = new RoomService(mockDynamo as any, mockApi as any);

      await service.setReady("room1", "a");

      expect(mockDynamo.send).toHaveBeenCalledTimes(1);
      const updateCall = mockDynamo.send.mock.calls[0][0];
      expect(updateCall.input.UpdateExpression).toBe("SET #field = :val");
      expect(updateCall.input.ExpressionAttributeNames).toEqual({
        "#field": "realtime_a_ready",
      });
      expect(updateCall.input.ExpressionAttributeValues).toEqual({
        ":val": true,
      });
    });

    it("funciona para slot b", async () => {
      mockDynamo.send.mockResolvedValue({});

      const service = new RoomService(mockDynamo as any, mockApi as any);

      await service.setReady("room1", "b");

      const updateCall = mockDynamo.send.mock.calls[0][0];
      expect(updateCall.input.ExpressionAttributeNames).toEqual({
        "#field": "realtime_b_ready",
      });
    });

    it("maneja errores gracefully", async () => {
      mockDynamo.send.mockRejectedValue(new Error("DynamoDB error"));

      const service = new RoomService(mockDynamo as any, mockApi as any);

      // Should not throw
      await expect(service.setReady("room1", "a")).resolves.not.toThrow();
    });
  });
});
