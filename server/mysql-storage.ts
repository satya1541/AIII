import { eq, desc, and, sql } from 'drizzle-orm';
import { db, initializeTables, testConnection } from './database';
import { 
  MqttConnection, 
  InsertMqttConnection,
  MqttTopic,
  InsertMqttTopic,
  MqttMessage,
  InsertMqttMessage,
  TopicKey,
  InsertTopicKey,
  User,
  InsertUser,
  DeviceLocation,
  InsertDeviceLocation,
  mqttConnections,
  mqttTopics,
  mqttMessages,
  topicKeys,
  users,
  deviceLocations
} from "@shared/schema";
import { IStorage } from './storage';

export class MySQLStorage implements IStorage {
  private initialized = false;

  async initialize() {
    if (this.initialized) return true;

    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to MySQL database');
    }

    const tablesCreated = await initializeTables();
    if (!tablesCreated) {
      throw new Error('Failed to initialize database tables');
    }

    this.initialized = true;
    return true;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    await this.initialize();
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.initialize();
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    await this.initialize();
    const result = await db.insert(users).values(user);
    const insertId = result[0].insertId as number;
    return { id: insertId, ...user };
  }

  // Connection methods
  async getConnections(): Promise<MqttConnection[]> {
    await this.initialize();
    return await db.select().from(mqttConnections).orderBy(desc(mqttConnections.createdAt));
  }

  async getConnection(id: number): Promise<MqttConnection | undefined> {
    await this.initialize();
    const result = await db.select().from(mqttConnections).where(eq(mqttConnections.id, id)).limit(1);
    return result[0];
  }

  async createConnection(connection: InsertMqttConnection): Promise<MqttConnection> {
    await this.initialize();
    const result = await db.insert(mqttConnections).values(connection);
    const insertId = result[0].insertId as number;
    return { 
      id: insertId, 
      ...connection,
      port: connection.port ?? 8000,
      protocol: connection.protocol ?? "ws",
      username: connection.username ?? null,
      password: connection.password ?? null,
      useAuth: connection.useAuth ?? false,
      isConnected: connection.isConnected ?? false,
      createdAt: new Date()
    };
  }

  async updateConnection(id: number, updates: Partial<MqttConnection>): Promise<MqttConnection | undefined> {
    await this.initialize();
    await db.update(mqttConnections).set(updates).where(eq(mqttConnections.id, id));
    return this.getConnection(id);
  }

  async deleteConnection(id: number): Promise<boolean> {
    await this.initialize();
    const result = await db.delete(mqttConnections).where(eq(mqttConnections.id, id));
    return result[0].affectedRows > 0;
  }

  // Topic methods
  async getTopicsByConnection(connectionId: number): Promise<MqttTopic[]> {
    await this.initialize();
    
    // Clean up duplicates first - get unique topics only
    const allTopics = await db.select().from(mqttTopics)
      .where(eq(mqttTopics.connectionId, connectionId))
      .orderBy(desc(mqttTopics.lastMessageAt));
    
    // Group by topic and keep only the one with highest ID (most recent)
    const uniqueTopics = new Map<string, MqttTopic>();
    for (const topic of allTopics) {
      const existing = uniqueTopics.get(topic.topic);
      if (!existing || topic.id > existing.id) {
        uniqueTopics.set(topic.topic, topic);
      }
    }
    
    return Array.from(uniqueTopics.values()).sort((a, b) => 
      (b.lastMessageAt?.getTime() || 0) - (a.lastMessageAt?.getTime() || 0)
    );
  }

  async getTopic(id: number): Promise<MqttTopic | undefined> {
    await this.initialize();
    const result = await db.select().from(mqttTopics).where(eq(mqttTopics.id, id)).limit(1);
    return result[0];
  }

  async createTopic(topic: InsertMqttTopic): Promise<MqttTopic> {
    await this.initialize();
    const result = await db.insert(mqttTopics).values(topic);
    const insertId = result[0].insertId as number;
    return { 
      id: insertId, 
      ...topic,
      qos: topic.qos ?? 0,
      isSubscribed: topic.isSubscribed ?? true,
      messageCount: 0,
      lastMessageAt: null
    };
  }

  async updateTopic(id: number, updates: Partial<MqttTopic>): Promise<MqttTopic | undefined> {
    await this.initialize();
    await db.update(mqttTopics).set(updates).where(eq(mqttTopics.id, id));
    return this.getTopic(id);
  }

  async deleteTopic(id: number): Promise<boolean> {
    await this.initialize();
    const result = await db.delete(mqttTopics).where(eq(mqttTopics.id, id));
    return result[0].affectedRows > 0;
  }

  // Message methods
  async getMessages(connectionId?: number, limit = 100): Promise<MqttMessage[]> {
    await this.initialize();
    
    if (connectionId !== undefined) {
      return await db.select().from(mqttMessages)
        .where(eq(mqttMessages.connectionId, connectionId))
        .orderBy(desc(mqttMessages.timestamp))
        .limit(limit);
    }

    return await db.select().from(mqttMessages)
      .orderBy(desc(mqttMessages.timestamp))
      .limit(limit);
  }

  async getMessage(id: number): Promise<MqttMessage | undefined> {
    await this.initialize();
    const result = await db.select().from(mqttMessages).where(eq(mqttMessages.id, id)).limit(1);
    return result[0];
  }

  async createMessage(message: InsertMqttMessage): Promise<MqttMessage> {
    await this.initialize();

    // Extract JSON keys from payload
    let extractedKeys = null;
    try {
      const parsedPayload = JSON.parse(message.payload);
      if (typeof parsedPayload === 'object' && parsedPayload !== null) {
        extractedKeys = this.extractKeysFromObject(parsedPayload);

        // Update topic keys
        for (const [keyName, value] of Object.entries(extractedKeys)) {
          await this.createOrUpdateTopicKey({
            topic: message.topic,
            keyName,
            keyType: typeof value,
            lastValue: String(value),
            valueCount: 1,
          });
        }
      }
    } catch (error) {
      // Not JSON, skip key extraction
    }

    const messageWithKeys = {
      ...message,
      qos: message.qos ?? 0,
      retain: message.retain ?? false,
      extractedKeys
    };

    const result = await db.insert(mqttMessages).values(messageWithKeys);
    const insertId = result[0].insertId as number;

    // Update topic message count
    await db.update(mqttTopics)
      .set({ 
        messageCount: sql`message_count + 1`,
        lastMessageAt: new Date()
      })
      .where(and(
        eq(mqttTopics.connectionId, message.connectionId),
        eq(mqttTopics.topic, message.topic)
      ));

    return { 
      id: insertId, 
      ...messageWithKeys,
      timestamp: new Date()
    };
  }

  async getMessagesByTopic(topic: string, limit = 100): Promise<MqttMessage[]> {
    await this.initialize();
    return await db.select().from(mqttMessages)
      .where(eq(mqttMessages.topic, topic))
      .orderBy(desc(mqttMessages.timestamp))
      .limit(limit);
  }

  

  // Topic Keys methods
  async getTopicKeys(topic: string): Promise<TopicKey[]> {
    await this.initialize();
    return await db.select().from(topicKeys)
      .where(eq(topicKeys.topic, topic))
      .orderBy(desc(topicKeys.lastSeenAt));
  }

  async createOrUpdateTopicKey(keyData: any): Promise<void> {
    await this.initialize();

    try {
      console.log(`Creating/updating topic key:`, keyData);

      // Try to find existing key
      const existing = await db.select().from(topicKeys)
        .where(and(
          eq(topicKeys.topic, keyData.topic),
          eq(topicKeys.keyName, keyData.keyName)
        ))
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        console.log(`Updating existing key: ${keyData.keyName}`);
        await db.update(topicKeys)
          .set({
            keyType: keyData.keyType,
            lastValue: keyData.lastValue,
            valueCount: sql`value_count + 1`,
            lastSeenAt: new Date(),
          })
          .where(eq(topicKeys.id, existing[0].id));
      } else {
        // Create new
        console.log(`Creating new key: ${keyData.keyName}`);
        await db.insert(topicKeys).values({
          topic: keyData.topic,
          keyName: keyData.keyName,
          keyType: keyData.keyType,
          lastValue: keyData.lastValue,
          valueCount: keyData.valueCount || 1,
        });
      }
    } catch (error) {
      console.error('Error in createOrUpdateTopicKey:', error);
      throw error;
    }
  }

  async getKeyValues(topic: string, keyName: string, limit = 100): Promise<any[]> {
    await this.initialize();
    try {
      const messages = await db.select().from(mqttMessages)
        .where(eq(mqttMessages.topic, topic))
        .orderBy(desc(mqttMessages.timestamp))
        .limit(limit);

      return messages.map(msg => {
        try {
          const keys = msg.extractedKeys as any;
          if (keys && keys[keyName] !== undefined) {
            return {
              value: keys[keyName],
              timestamp: msg.timestamp,
            };
          }
          return null;
        } catch {
          return null;
        }
      }).filter(item => item !== null);
    } catch (error) {
      console.error('Error in getKeyValues:', error);
      return [];
    }
  }

  // Device Location methods
  async getDeviceLocations(connectionId?: number): Promise<DeviceLocation[]> {
    try {
      const query = db.select().from(deviceLocations);
      
      if (connectionId) {
        return await query.where(eq(deviceLocations.connectionId, connectionId));
      }
      
      return await query;
    } catch (error) {
      console.error('Error in getDeviceLocations:', error);
      return [];
    }
  }

  async getDeviceLocation(id: number): Promise<DeviceLocation | undefined> {
    try {
      const result = await db.select()
        .from(deviceLocations)
        .where(eq(deviceLocations.id, id))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error('Error in getDeviceLocation:', error);
      return undefined;
    }
  }

  async createDeviceLocation(deviceLocation: InsertDeviceLocation): Promise<DeviceLocation> {
    try {
      const [result] = await db.insert(deviceLocations)
        .values(deviceLocation);
      
      return await this.getDeviceLocation(result.insertId) as DeviceLocation;
    } catch (error) {
      console.error('Error in createDeviceLocation:', error);
      throw error;
    }
  }

  async updateDeviceLocation(id: number, updates: Partial<DeviceLocation>): Promise<DeviceLocation | undefined> {
    try {
      await db.update(deviceLocations)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(deviceLocations.id, id));
      
      return await this.getDeviceLocation(id);
    } catch (error) {
      console.error('Error in updateDeviceLocation:', error);
      return undefined;
    }
  }

  async deleteDeviceLocation(id: number): Promise<boolean> {
    try {
      await db.delete(deviceLocations)
        .where(eq(deviceLocations.id, id));
      
      return true;
    } catch (error) {
      console.error('Error in deleteDeviceLocation:', error);
      return false;
    }
  }

  async getMessagesWithLocation(connectionId?: number, topic?: string, limit = 100): Promise<MqttMessage[]> {
    try {
      let query = db.select()
        .from(mqttMessages)
        .where(and(
          sql`${mqttMessages.latitude} IS NOT NULL`,
          sql`${mqttMessages.longitude} IS NOT NULL`
        ))
        .orderBy(desc(mqttMessages.timestamp))
        .limit(limit);

      if (connectionId && topic) {
        query = query.where(and(
          eq(mqttMessages.connectionId, connectionId),
          eq(mqttMessages.topic, topic),
          sql`${mqttMessages.latitude} IS NOT NULL`,
          sql`${mqttMessages.longitude} IS NOT NULL`
        ));
      } else if (connectionId) {
        query = query.where(and(
          eq(mqttMessages.connectionId, connectionId),
          sql`${mqttMessages.latitude} IS NOT NULL`,
          sql`${mqttMessages.longitude} IS NOT NULL`
        ));
      }

      return await query;
    } catch (error) {
      console.error('Error in getMessagesWithLocation:', error);
      return [];
    }
  }

  private extractKeysFromObject(obj: any, prefix = ''): Record<string, any> {
    const keys: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        // Nested object - extract recursively but limit depth
        if (prefix.split('.').length < 3) {
          Object.assign(keys, this.extractKeysFromObject(value, fullKey));
        }
      } else {
        // Primitive value or array
        keys[fullKey] = value;
      }
    }

    return keys;
  }
}