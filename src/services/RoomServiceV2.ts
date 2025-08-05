import { RoomRepository } from "@/repositories/RoomRepository";
import { ConnectionRepository } from "@/repositories/ConnectionRepository";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { RoomEvent } from "@/types/RoomEvent";

// [Note] V2 implementation is based on ElectroDB repos
export class RoomServiceV2 {
  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly connectionRepository: ConnectionRepository,
    private readonly api: ApiGatewayManagementApiClient
  ) {}

  async broadcastToRoom(
    roomId: string,
    event: RoomEvent,
    excludeConnectionId?: string
  ): Promise<void> {
    console.log("[RoomServiceV2] Broadcasting to room", { roomId, event });

    let connections = await this.connectionRepository.findConnectionsByRoom(
      roomId
    );

    if (excludeConnectionId) {
      connections = connections.filter(
        ({ connectionId }) => connectionId !== excludeConnectionId
      );
    }

    console.log("[RoomServiceV2] Broadcasting to connections", {
      connections,
      event,
    });

    await Promise.all(
      connections.map(async ({ connectionId }) =>
        this.api
          .send(
            new PostToConnectionCommand({
              ConnectionId: connectionId,
              Data: Buffer.from(JSON.stringify(event)),
            })
          )
          .catch(async (err) => {
            if (err.statusCode === 410) {
              console.log("Stale connection", connectionId);
              // Clean up stale connection using repository
              try {
                await this.connectionRepository.deleteConnection(connectionId);
                console.log("Deleted stale connection from DB", connectionId);
              } catch (e) {
                console.error(
                  "Error deleting stale connection",
                  connectionId,
                  e
                );
              }
            } else {
              console.error("Error posting to connection", err);
            }
          })
      )
    );
  }

  async addCompletedCategory(
    roomId: string,
    slot: "a" | "b",
    category: string
  ): Promise<void> {
    await this.roomRepository.addCompletedCategory(roomId, slot, category);
  }

  async removeCompletedCategory(
    roomId: string,
    slot: "a" | "b",
    category: string
  ): Promise<void> {
    await this.roomRepository.removeCompletedCategory(roomId, slot, category);
  }

  async setRealtimeInRoomSlot(
    roomId: string,
    slot: "a" | "b",
    value: boolean
  ): Promise<void> {
    await this.roomRepository.setRealtimeInRoomSlot(roomId, slot, value);
  }

  async fixCategory(
    roomId: string,
    slot: "a" | "b",
    category: string
  ): Promise<void> {
    await this.roomRepository.fixCategory(roomId, slot, category);
  }

  async setReady(roomId: string, slot: "a" | "b"): Promise<void> {
    await this.roomRepository.setReady(roomId, slot);
  }

  async setNotReady(roomId: string, slot: "a" | "b"): Promise<void> {
    await this.roomRepository.setNotReady(roomId, slot);
  }

  async getRoom(roomId: string) {
    return await this.roomRepository.getRoom(roomId);
  }

  async updateRoom(roomId: string, updates: any) {
    await this.roomRepository.updateRoom(roomId, updates);
  }
}
