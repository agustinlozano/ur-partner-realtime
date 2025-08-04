import { ServiceFactory } from "@/services/ServiceFactory";

// handlers/messageRouter.ts
type Params = {
  body: any;
  connectionId: string;
  roomService: ReturnType<typeof ServiceFactory.prototype.createRoomService>;
};

export const routeMessage = async ({
  body,
  connectionId,
  roomService,
}: Params) => {
  const { type, roomId, slot, category } = body;

  const broadcast = () =>
    roomService.broadcastToRoom(roomId, body, connectionId);

  switch (type) {
    case "get_in":
    case "say":
    case "ping":
      return broadcast();

    case "leave":
      await roomService.setRealtimeInRoomSlot(roomId, slot, false);
      return broadcast();

    case "category_fixed":
      await roomService.fixCategory(roomId, slot, category);
      return broadcast();

    case "category_completed":
      await roomService.addCompletedCategory(roomId, slot, category);
      return broadcast();

    case "category_uncompleted":
      await roomService.removeCompletedCategory(roomId, slot, category);
      return broadcast();

    case "is_ready":
      await roomService.setReady(roomId, slot);
      return broadcast();

    case "not_ready":
      await roomService.setNotReady(roomId, slot);
      return broadcast();

    default:
      // Broadcast unknown message type
      return roomService.broadcastToRoom(roomId, body);
  }
};
