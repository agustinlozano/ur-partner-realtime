import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { createRoomEntity, RoomEntity, RoomItem } from "./entities/Room";

export class RoomRepository {
  private entity: RoomEntity;

  constructor(private readonly client: DynamoDBDocumentClient) {
    this.entity = createRoomEntity(client);
  }

  /**
   * Get a room by ID
   */
  async getRoom(roomId: string): Promise<RoomItem | null> {
    try {
      const result = await this.entity.get({ room_id: roomId }).go();
      return result.data as RoomItem;
    } catch (error: any) {
      if (error.name === "ItemNotFoundError") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get specific fields from a room
   */
  async getRoomFields(
    roomId: string,
    fields: (keyof RoomItem)[]
  ): Promise<Partial<RoomItem> | null> {
    try {
      const result = await this.entity
        .get({ room_id: roomId })
        .go({ attributes: fields });
      return result.data as Partial<RoomItem>;
    } catch (error: any) {
      if (error.name === "ItemNotFoundError") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Set realtime presence in room for a slot
   */
  async setRealtimeInRoomSlot(
    roomId: string,
    slot: "a" | "b",
    value: boolean
  ): Promise<void> {
    const fieldName =
      slot === "a" ? "realtime_in_room_a" : "realtime_in_room_b";

    await this.entity
      .patch({ room_id: roomId })
      .set({ [fieldName]: value })
      .go();

    console.log(
      `[RoomRepository] Updated ${fieldName} to ${value} in Rooms table`,
      { roomId }
    );
  }

  /**
   * Add a completed category for a slot
   */
  async addCompletedCategory(
    roomId: string,
    slot: "a" | "b",
    category: string
  ): Promise<void> {
    const fieldName =
      slot === "a"
        ? "realtime_a_completed_categories"
        : "realtime_b_completed_categories";

    // Get current categories
    const room = await this.getRoomFields(roomId, [fieldName]);
    let categoriesArr =
      (room?.[fieldName] as Array<{ category: string; value: number }>) || [];

    // Check if category already exists
    const exists = categoriesArr.some((item) => item.category === category);

    if (!exists) {
      categoriesArr.push({ category, value: Date.now() });

      await this.entity
        .patch({ room_id: roomId })
        .set({ [fieldName]: categoriesArr })
        .go();

      console.log(`[RoomRepository] Added category to ${fieldName}`, {
        roomId,
        category,
        categoriesArr,
      });
    } else {
      console.log(`[RoomRepository] Category already present in ${fieldName}`, {
        roomId,
        category,
      });
    }
  }

  /**
   * Remove a completed category for a slot
   */
  async removeCompletedCategory(
    roomId: string,
    slot: "a" | "b",
    category: string
  ): Promise<void> {
    const fieldName =
      slot === "a"
        ? "realtime_a_completed_categories"
        : "realtime_b_completed_categories";

    // Get current categories
    const room = await this.getRoomFields(roomId, [fieldName]);
    let categoriesArr =
      (room?.[fieldName] as Array<{ category: string; value: number }>) || [];

    // Check if category exists and remove it
    const initialLength = categoriesArr.length;
    categoriesArr = categoriesArr.filter((item) => item.category !== category);

    if (categoriesArr.length < initialLength) {
      await this.entity
        .patch({ room_id: roomId })
        .set({ [fieldName]: categoriesArr })
        .go();

      console.log(
        `[RoomRepository] Removed category from ${fieldName} in Rooms table`,
        {
          roomId,
          category,
          categoriesArr,
        }
      );
    } else {
      console.log(
        `[RoomRepository] Category not found in ${fieldName}, no action taken`,
        {
          roomId,
          category,
        }
      );
    }
  }

  /**
   * Fix a category for a slot
   */
  async fixCategory(
    roomId: string,
    slot: "a" | "b",
    category: string
  ): Promise<void> {
    const fieldName =
      slot === "a" ? "realtime_a_fixed_category" : "realtime_b_fixed_category";

    await this.entity
      .patch({ room_id: roomId })
      .set({ [fieldName]: category })
      .go();

    console.log(
      `[RoomRepository] Updated ${fieldName} to ${category} in Rooms table`,
      { roomId }
    );
  }

  /**
   * Set ready status for a slot
   */
  async setReady(roomId: string, slot: "a" | "b"): Promise<void> {
    const fieldName = slot === "a" ? "realtime_a_ready" : "realtime_b_ready";

    await this.entity
      .patch({ room_id: roomId })
      .set({ [fieldName]: true })
      .go();

    console.log(
      `[RoomRepository] Updated ${fieldName} to true in Rooms table`,
      {
        roomId,
      }
    );
  }

  /**
   * Set not ready status for a slot
   */
  async setNotReady(roomId: string, slot: "a" | "b"): Promise<void> {
    const fieldName = slot === "a" ? "realtime_a_ready" : "realtime_b_ready";

    await this.entity
      .patch({ room_id: roomId })
      .set({ [fieldName]: false })
      .go();

    console.log(
      `[RoomRepository] Updated ${fieldName} to false in Rooms table`,
      {
        roomId,
      }
    );
  }

  /**
   * Create or update a room
   */
  async upsertRoom(
    roomData: Partial<RoomItem> & { room_id: string }
  ): Promise<RoomItem> {
    const result = await this.entity.upsert(roomData as any).go();
    return result.data as RoomItem;
  }

  /**
   * Update specific fields in a room
   */
  async updateRoom(
    roomId: string,
    updates: Partial<Omit<RoomItem, "room_id">>
  ): Promise<void> {
    await this.entity.patch({ room_id: roomId }).set(updates).go();

    console.log(`[RoomRepository] Updated room ${roomId}`, updates);
  }
}
