import { ConnectionRepository } from "@/repositories/ConnectionRepository";

// [Note] V2 implementation is based on ElectroDB repos
export class ConnectionServiceV2 {
  constructor(private readonly connectionRepository: ConnectionRepository) {}

  async saveConnection(
    connectionId: string,
    roomId: string,
    slot: "a" | "b"
  ): Promise<void> {
    await this.connectionRepository.saveConnection(connectionId, roomId, slot);
  }

  async deleteConnection(connectionId: string): Promise<void> {
    await this.connectionRepository.deleteConnection(connectionId);
  }

  async getConnectionsByRoom(roomId: string) {
    return await this.connectionRepository.findConnectionsByRoom(roomId);
  }

  async getConnectionByRoomAndSlot(roomId: string, slot: "a" | "b") {
    return await this.connectionRepository.findConnectionByRoomAndSlot(
      roomId,
      slot
    );
  }
}
