import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import {
  createConnectionEntity,
  ConnectionEntity,
  ConnectionItem,
} from "./entities/Connection";

export class ConnectionRepository {
  private entity: ConnectionEntity;

  constructor(private readonly client: DynamoDBDocumentClient) {
    this.entity = createConnectionEntity(client);
  }

  /**
   * Save a new connection, replacing any existing connection for the same roomId and slot
   */
  async saveConnection(
    connectionId: string,
    roomId: string,
    slot: "a" | "b"
  ): Promise<void> {
    // First, find any existing connection for this roomId and slot
    const existingConnections = await this.entity.query
      .byRoom({ roomId, slot })
      .go();

    // Delete existing connection if it exists and is different
    if (existingConnections.data.length > 0) {
      const existing = existingConnections.data[0];
      if (existing.connectionId !== connectionId) {
        await this.entity.delete({ connectionId: existing.connectionId }).go();
        console.log(
          `[ConnectionRepository] Deleted previous connection for roomId=${roomId} slot=${slot}:`,
          existing.connectionId
        );
      }
    }

    // Save the new connection
    await this.entity
      .create({
        connectionId,
        roomId,
        slot,
      })
      .go();

    console.log(
      `[ConnectionRepository] Saved connection: connectionId=${connectionId}, roomId=${roomId}, slot=${slot}`
    );
  }

  /**
   * Delete a connection by connectionId
   */
  async deleteConnection(connectionId: string): Promise<void> {
    await this.entity.delete({ connectionId }).go();
    console.log(`[ConnectionRepository] Deleted connection: ${connectionId}`);
  }

  /**
   * Find all connections for a specific room
   */
  async findConnectionsByRoom(roomId: string): Promise<ConnectionItem[]> {
    const result = await this.entity.query.byRoom({ roomId }).go();
    return result.data;
  }

  /**
   * Find a specific connection by roomId and slot
   */
  async findConnectionByRoomAndSlot(
    roomId: string,
    slot: "a" | "b"
  ): Promise<ConnectionItem | null> {
    const result = await this.entity.query.byRoom({ roomId, slot }).go();
    return result.data[0] || null;
  }
}
