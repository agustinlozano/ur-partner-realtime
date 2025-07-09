import { describe, it, expect, vi, beforeEach } from "vitest";
import { RoomService } from "./RoomService";

const mockSend = vi.fn().mockResolvedValue({});
const mockApi = { send: mockSend };
const mockDynamo = { send: vi.fn() };

describe("RoomService.broadcastToRoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
      { type: "get_in", slot: "a" } as any,
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
    } as any);

    expect(mockSend).toHaveBeenCalledTimes(2);
    const ids = mockSend.mock.calls.map((call) => call[0].input.ConnectionId);
    expect(ids).toContain("A");
    expect(ids).toContain("B");
  });
});
