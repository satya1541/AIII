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
  InsertDeviceLocation
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Connection methods
  getConnections(): Promise<MqttConnection[]>;
  getConnection(id: number): Promise<MqttConnection | undefined>;
  createConnection(connection: InsertMqttConnection): Promise<MqttConnection>;
  updateConnection(id: number, updates: Partial<MqttConnection>): Promise<MqttConnection | undefined>;
  deleteConnection(id: number): Promise<boolean>;

  // Topic methods
  getTopicsByConnection(connectionId: number): Promise<MqttTopic[]>;
  getTopic(id: number): Promise<MqttTopic | undefined>;
  createTopic(topic: InsertMqttTopic): Promise<MqttTopic>;
  updateTopic(id: number, updates: Partial<MqttTopic>): Promise<MqttTopic | undefined>;
  deleteTopic(id: number): Promise<boolean>;

  // Message methods
  getMessages(connectionId?: number, limit?: number): Promise<MqttMessage[]>;
  getMessage(id: number): Promise<MqttMessage | undefined>;
  createMessage(message: InsertMqttMessage): Promise<MqttMessage>;
  getMessagesByTopic(topic: string, limit?: number): Promise<MqttMessage[]>;

  

  // Topic Keys methods
  getTopicKeys(topic: string): Promise<TopicKey[]>;
  createOrUpdateTopicKey(topicKey: InsertTopicKey): Promise<TopicKey>;
  getKeyValues(topic: string, keyName: string, limit?: number): Promise<any[]>;

  // Device Location methods
  getDeviceLocations(connectionId?: number): Promise<DeviceLocation[]>;
  getDeviceLocation(id: number): Promise<DeviceLocation | undefined>;
  createDeviceLocation(deviceLocation: InsertDeviceLocation): Promise<DeviceLocation>;
  updateDeviceLocation(id: number, updates: Partial<DeviceLocation>): Promise<DeviceLocation | undefined>;
  deleteDeviceLocation(id: number): Promise<boolean>;
  getMessagesWithLocation(connectionId?: number, topic?: string, limit?: number): Promise<MqttMessage[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private connections: Map<number, MqttConnection>;
  private topics: Map<number, MqttTopic>;
  private messages: Map<number, MqttMessage>;
  private insights: Map<number, AiInsight>;
  private topicKeys: Map<number, TopicKey>;
  private currentUserId: number;
  private currentConnectionId: number;
  private currentTopicId: number;
  private currentMessageId: number;
  private currentInsightId: number;
  private currentTopicKeyId: number;

  constructor() {
    this.users = new Map();
    this.connections = new Map();
    this.topics = new Map();
    this.messages = new Map();
    this.insights = new Map();
    this.topicKeys = new Map();
    this.currentUserId = 1;
    this.currentConnectionId = 1;
    this.currentTopicId = 1;
    this.currentMessageId = 1;
    this.currentInsightId = 1;
    this.currentTopicKeyId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Connection methods
  async getConnections(): Promise<MqttConnection[]> {
    return Array.from(this.connections.values());
  }

  async getConnection(id: number): Promise<MqttConnection | undefined> {
    return this.connections.get(id);
  }

  async createConnection(insertConnection: InsertMqttConnection): Promise<MqttConnection> {
    const id = this.currentConnectionId++;
    const connection: MqttConnection = {
      id,
      name: insertConnection.name,
      brokerUrl: insertConnection.brokerUrl,
      port: insertConnection.port ?? 8000,
      protocol: insertConnection.protocol ?? "ws",
      clientId: insertConnection.clientId,
      username: insertConnection.username ?? null,
      password: insertConnection.password ?? null,
      useAuth: insertConnection.useAuth ?? false,
      isConnected: insertConnection.isConnected ?? false,
      createdAt: new Date(),
    };
    this.connections.set(id, connection);
    return connection;
  }

  async updateConnection(id: number, updates: Partial<MqttConnection>): Promise<MqttConnection | undefined> {
    const connection = this.connections.get(id);
    if (!connection) return undefined;
    
    const updated = { ...connection, ...updates };
    this.connections.set(id, updated);
    return updated;
  }

  async deleteConnection(id: number): Promise<boolean> {
    return this.connections.delete(id);
  }

  // Topic methods
  async getTopicsByConnection(connectionId: number): Promise<MqttTopic[]> {
    return Array.from(this.topics.values()).filter(topic => topic.connectionId === connectionId);
  }

  async getTopic(id: number): Promise<MqttTopic | undefined> {
    return this.topics.get(id);
  }

  async createTopic(insertTopic: InsertMqttTopic): Promise<MqttTopic> {
    const id = this.currentTopicId++;
    const topic: MqttTopic = {
      id,
      connectionId: insertTopic.connectionId,
      topic: insertTopic.topic,
      qos: insertTopic.qos ?? 0,
      isSubscribed: insertTopic.isSubscribed ?? true,
      messageCount: 0,
      lastMessageAt: null,
    };
    this.topics.set(id, topic);
    return topic;
  }

  async updateTopic(id: number, updates: Partial<MqttTopic>): Promise<MqttTopic | undefined> {
    const topic = this.topics.get(id);
    if (!topic) return undefined;
    
    const updated = { ...topic, ...updates };
    this.topics.set(id, updated);
    return updated;
  }

  async deleteTopic(id: number): Promise<boolean> {
    return this.topics.delete(id);
  }

  // Message methods
  async getMessages(connectionId?: number, limit = 100): Promise<MqttMessage[]> {
    let messages = Array.from(this.messages.values());
    
    if (connectionId !== undefined) {
      messages = messages.filter(msg => msg.connectionId === connectionId);
    }
    
    return messages
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getMessage(id: number): Promise<MqttMessage | undefined> {
    return this.messages.get(id);
  }

  async createMessage(insertMessage: InsertMqttMessage): Promise<MqttMessage> {
    const id = this.currentMessageId++;
    
    // Extract JSON keys from payload
    let extractedKeys = null;
    try {
      const parsedPayload = JSON.parse(insertMessage.payload);
      if (typeof parsedPayload === 'object' && parsedPayload !== null) {
        extractedKeys = this.extractKeysFromObject(parsedPayload);
        
        // Update topic keys
        for (const [keyName, value] of Object.entries(extractedKeys)) {
          await this.createOrUpdateTopicKey({
            topic: insertMessage.topic,
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

    const message: MqttMessage = {
      id,
      connectionId: insertMessage.connectionId,
      topic: insertMessage.topic,
      payload: insertMessage.payload,
      qos: insertMessage.qos ?? 0,
      retain: insertMessage.retain ?? false,
      timestamp: new Date(),
      aiAnalysis: insertMessage.aiAnalysis ?? null,
      extractedKeys,
    };
    this.messages.set(id, message);

    // Update topic message count
    const topics = Array.from(this.topics.values()).filter(
      topic => topic.connectionId === message.connectionId && 
      this.topicMatches(message.topic, topic.topic)
    );
    
    for (const topic of topics) {
      await this.updateTopic(topic.id, {
        messageCount: topic.messageCount + 1,
        lastMessageAt: message.timestamp,
      });
    }

    return message;
  }

  async getMessagesByTopic(topic: string, limit = 100): Promise<MqttMessage[]> {
    return Array.from(this.messages.values())
      .filter(msg => this.topicMatches(msg.topic, topic))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // AI Insights methods
  async getInsights(limit = 50): Promise<AiInsight[]> {
    return Array.from(this.insights.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async createInsight(insertInsight: InsertAiInsight): Promise<AiInsight> {
    const id = this.currentInsightId++;
    const insight: AiInsight = {
      id,
      type: insertInsight.type,
      severity: insertInsight.severity,
      title: insertInsight.title,
      description: insertInsight.description,
      topic: insertInsight.topic,
      confidence: insertInsight.confidence ?? 70,
      messageId: insertInsight.messageId ?? null,
      metadata: insertInsight.metadata ?? {},
      createdAt: new Date(),
    };
    this.insights.set(id, insight);
    return insight;
  }

  async getInsightsByTopic(topic: string): Promise<AiInsight[]> {
    return Array.from(this.insights.values())
      .filter(insight => insight.topic === topic)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Topic Keys methods
  async getTopicKeys(topic: string): Promise<TopicKey[]> {
    return Array.from(this.topicKeys.values())
      .filter(key => key.topic === topic)
      .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());
  }

  async createOrUpdateTopicKey(insertTopicKey: InsertTopicKey): Promise<TopicKey> {
    // Check if key already exists
    const existingKey = Array.from(this.topicKeys.values()).find(
      key => key.topic === insertTopicKey.topic && key.keyName === insertTopicKey.keyName
    );

    if (existingKey) {
      // Update existing key
      const updated: TopicKey = {
        ...existingKey,
        keyType: insertTopicKey.keyType,
        lastValue: insertTopicKey.lastValue ?? existingKey.lastValue,
        valueCount: existingKey.valueCount + (insertTopicKey.valueCount ?? 1),
        lastSeenAt: new Date(),
      };
      this.topicKeys.set(existingKey.id, updated);
      return updated;
    } else {
      // Create new key
      const id = this.currentTopicKeyId++;
      const topicKey: TopicKey = {
        id,
        topic: insertTopicKey.topic,
        keyName: insertTopicKey.keyName,
        keyType: insertTopicKey.keyType,
        lastValue: insertTopicKey.lastValue ?? null,
        valueCount: insertTopicKey.valueCount ?? 1,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      };
      this.topicKeys.set(id, topicKey);
      return topicKey;
    }
  }

  async getKeyValues(topic: string, keyName: string, limit = 100): Promise<any[]> {
    return Array.from(this.messages.values())
      .filter(msg => msg.topic === topic && msg.extractedKeys)
      .map(msg => {
        try {
          const keys = msg.extractedKeys as any;
          return {
            value: keys[keyName],
            timestamp: msg.timestamp,
          };
        } catch {
          return null;
        }
      })
      .filter(item => item !== null && item.value !== undefined)
      .sort((a, b) => (b?.timestamp.getTime() || 0) - (a?.timestamp.getTime() || 0))
      .slice(0, limit);
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

  private topicMatches(messageTopic: string, subscriptionTopic: string): boolean {
    if (subscriptionTopic === messageTopic) return true;
    if (subscriptionTopic.includes('#')) {
      const prefix = subscriptionTopic.replace('/#', '');
      return messageTopic.startsWith(prefix);
    }
    if (subscriptionTopic.includes('+')) {
      const pattern = subscriptionTopic.replace(/\+/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(messageTopic);
    }
    return false;
  }
}

import { MySQLStorage } from './mysql-storage';

export const storage = new MySQLStorage();
