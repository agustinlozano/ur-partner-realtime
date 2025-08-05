import { describe, it, expect, vi, beforeEach } from "vitest";
import { RoomService } from "./RoomService";

const mockSend = vi.fn().mockResolvedValue({});
const mockApi = { send: mockSend };

// Mock repositories
const mockRoomRepository = {
  addCompletedCategory: vi.fn().mockResolvedValue(undefined),
  removeCompletedCategory: vi.fn().mockResolvedValue(undefined),
  setRealtimeInRoomSlot: vi.fn().mockResolvedValue(undefined),
  fixCategory: vi.fn().mockResolvedValue(undefined),
  setReady: vi.fn().mockResolvedValue(undefined),
  setNotReady: vi.fn().mockResolvedValue(undefined),
  getRoom: vi.fn().mockResolvedValue(null),
  updateRoom: vi.fn().mockResolvedValue(undefined),
  getRoomFields: vi.fn().mockResolvedValue(null),
};

const mockConnectionRepository = {
  findConnectionsByRoom: vi.fn().mockResolvedValue([]),
  deleteConnection: vi.fn().mockResolvedValue(undefined),
};

// Mock environment variables
process.env.CONNECTIONS_TABLE = "connections-table";
process.env.ROOMS_TABLE = "rooms-table";

describe("RoomService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("broadcastToRoom", () => {
    it("no envía el evento al emisor (excludeConnectionId)", async () => {
      mockConnectionRepository.findConnectionsByRoom.mockResolvedValue([
        { connectionId: "A", roomId: "room1", slot: "a" },
        { connectionId: "B", roomId: "room1", slot: "b" },
      ]);

      const service = new RoomService(
        mockRoomRepository as any,
        mockConnectionRepository as any,
        mockApi as any
      );

      await service.broadcastToRoom(
        "room1",
        { type: "get_in", slot: "a" },
        "A"
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0][0].input.ConnectionId).toBe("B");
    });

    it("envía a todos si no se excluye a nadie", async () => {
      mockConnectionRepository.findConnectionsByRoom.mockResolvedValue([
        { connectionId: "A", roomId: "room1", slot: "a" },
        { connectionId: "B", roomId: "room1", slot: "b" },
      ]);

      const service = new RoomService(
        mockRoomRepository as any,
        mockConnectionRepository as any,
        mockApi as any
      );

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
      mockConnectionRepository.findConnectionsByRoom.mockResolvedValue([
        { connectionId: "stale-connection", roomId: "room1", slot: "a" },
      ]);

      mockSend.mockRejectedValueOnce({ statusCode: 410 });

      const service = new RoomService(
        mockRoomRepository as any,
        mockConnectionRepository as any,
        mockApi as any
      );

      await service.broadcastToRoom("room1", { type: "ping", slot: "a" });

      // Should call deleteConnection from repository
      expect(mockConnectionRepository.deleteConnection).toHaveBeenCalledWith(
        "stale-connection"
      );
    });

    it("maneja errores de conexión que no son 410", async () => {
      mockConnectionRepository.findConnectionsByRoom.mockResolvedValue([
        { connectionId: "A", roomId: "room1", slot: "a" },
      ]);

      mockSend.mockRejectedValueOnce({
        statusCode: 500,
        message: "Server error",
      });

      const service = new RoomService(
        mockRoomRepository as any,
        mockConnectionRepository as any,
        mockApi as any
      );

      // Should not throw error
      await expect(
        service.broadcastToRoom("room1", { type: "ping", slot: "a" })
      ).resolves.not.toThrow();
    });
  });

  describe("addCompletedCategory", () => {
    it("agrega una nueva categoría completada", async () => {
      const service = new RoomService(
        mockRoomRepository as any,
        mockConnectionRepository as any,
        mockApi as any
      );

      await service.addCompletedCategory("room1", "a", "animals");

      expect(mockRoomRepository.addCompletedCategory).toHaveBeenCalledWith(
        "room1",
        "a",
        "animals"
      );
    });

    it("maneja errores gracefully", async () => {
      mockRoomRepository.addCompletedCategory.mockRejectedValue(
        new Error("Repository error")
      );

      const service = new RoomService(
        mockRoomRepository as any,
        mockConnectionRepository as any,
        mockApi as any
      );

      // Should throw the error from repository
      await expect(
        service.addCompletedCategory("room1", "a", "animals")
      ).rejects.toThrow("Repository error");
    });
  });

  describe("removeCompletedCategory", () => {
    it("remueve una categoría completada existente", async () => {
      const service = new RoomService(
        mockRoomRepository as any,
        mockConnectionRepository as any,
        mockApi as any
      );

      await service.removeCompletedCategory("room1", "a", "animals");

      expect(mockRoomRepository.removeCompletedCategory).toHaveBeenCalledWith(
        "room1",
        "a",
        "animals"
      );
    });

    it("maneja errores gracefully", async () => {
      mockRoomRepository.removeCompletedCategory.mockRejectedValue(
        new Error("Repository error")
      );

      const service = new RoomService(
        mockRoomRepository as any,
        mockConnectionRepository as any,
        mockApi as any
      );

      // Should throw the error from repository
      await expect(
        service.removeCompletedCategory("room1", "a", "animals")
      ).rejects.toThrow("Repository error");
    });
  });

  describe("setRealtimeInRoomSlot", () => {
    it("actualiza el estado de presencia en la sala", async () => {
      const service = new RoomService(
        mockRoomRepository as any,
        mockConnectionRepository as any,
        mockApi as any
      );

      await service.setRealtimeInRoomSlot("room1", "a", true);

      expect(mockRoomRepository.setRealtimeInRoomSlot).toHaveBeenCalledWith(
        "room1",
        "a",
        true
      );
    });

    it("funciona para slot b", async () => {
      const service = new RoomService(
        mockRoomRepository as any,
        mockConnectionRepository as any,
        mockApi as any
      );

      await service.setRealtimeInRoomSlot("room1", "b", false);

      expect(mockRoomRepository.setRealtimeInRoomSlot).toHaveBeenCalledWith(
        "room1",
        "b",
        false
      );
    });

    it("maneja errores gracefully", async () => {
      mockRoomRepository.setRealtimeInRoomSlot.mockRejectedValue(
        new Error("Repository error")
      );

      const service = new RoomService(
        mockRoomRepository as any,
        mockConnectionRepository as any,
        mockApi as any
      );

      // Should throw the error from repository
      await expect(
        service.setRealtimeInRoomSlot("room1", "a", true)
      ).rejects.toThrow("Repository error");
    });
  });

  describe("fixCategory", () => {
    it("fija una categoría para un slot", async () => {
      const service = new RoomService(
        mockRoomRepository as any,
        mockConnectionRepository as any,
        mockApi as any
      );

      await service.fixCategory("room1", "a", "animals");

      expect(mockRoomRepository.fixCategory).toHaveBeenCalledWith(
        "room1",
        "a",
        "animals"
      );
    });

    it("funciona para slot b", async () => {
      const service = new RoomService(
        mockRoomRepository as any,
        mockConnectionRepository as any,
        mockApi as any
      );

      await service.fixCategory("room1", "b", "places");

      expect(mockRoomRepository.fixCategory).toHaveBeenCalledWith(
        "room1",
        "b",
        "places"
      );
    });

    it("maneja errores gracefully", async () => {
      mockRoomRepository.fixCategory.mockRejectedValue(
        new Error("Repository error")
      );

      const service = new RoomService(
        mockRoomRepository as any,
        mockConnectionRepository as any,
        mockApi as any
      );

      // Should throw the error from repository
      await expect(
        service.fixCategory("room1", "a", "animals")
      ).rejects.toThrow("Repository error");
    });
  });

  describe("setReady", () => {
    it("marca un slot como listo", async () => {
      const service = new RoomService(
        mockRoomRepository as any,
        mockConnectionRepository as any,
        mockApi as any
      );

      await service.setReady("room1", "a");

      expect(mockRoomRepository.setReady).toHaveBeenCalledWith("room1", "a");
    });

    it("funciona para slot b", async () => {
      const service = new RoomService(
        mockRoomRepository as any,
        mockConnectionRepository as any,
        mockApi as any
      );

      await service.setReady("room1", "b");

      expect(mockRoomRepository.setReady).toHaveBeenCalledWith("room1", "b");
    });

    it("maneja errores gracefully", async () => {
      mockRoomRepository.setReady.mockRejectedValue(
        new Error("Repository error")
      );

      const service = new RoomService(
        mockRoomRepository as any,
        mockConnectionRepository as any,
        mockApi as any
      );

      // Should throw the error from repository
      await expect(service.setReady("room1", "a")).rejects.toThrow(
        "Repository error"
      );
    });
  });
});
