import { mysqlTable, text, int, boolean, timestamp, json, decimal } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const mqttConnections = mysqlTable("mqtt_connections", {
  id: int("id").primaryKey().autoincrement(),
  name: text("name").notNull(),
  brokerUrl: text("broker_url").notNull(),
  port: int("port").notNull().default(8000),
  protocol: text("protocol").notNull().default("ws"),
  clientId: text("client_id").notNull(),
  username: text("username"),
  password: text("password"),
  useAuth: boolean("use_auth").notNull().default(false),
  isConnected: boolean("is_connected").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const mqttTopics = mysqlTable("mqtt_topics", {
  id: int("id").primaryKey().autoincrement(),
  connectionId: int("connection_id").notNull(),
  topic: text("topic").notNull(),
  qos: int("qos").notNull().default(0),
  isSubscribed: boolean("is_subscribed").notNull().default(true),
  messageCount: int("message_count").notNull().default(0),
  lastMessageAt: timestamp("last_message_at"),
});

export const mqttMessages = mysqlTable("mqtt_messages", {
  id: int("id").primaryKey().autoincrement(),
  connectionId: int("connection_id").notNull(),
  topic: text("topic").notNull(),
  payload: text("payload").notNull(),
  qos: int("qos").notNull().default(0),
  retain: boolean("retain").notNull().default(false),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  extractedKeys: json("extracted_keys"), // Store parsed JSON keys and values
  latitude: text("latitude"),
  longitude: text("longitude"),
  deviceId: text("device_id"),
});

export const topicKeys = mysqlTable("topic_keys", {
  id: int("id").primaryKey().autoincrement(),
  topic: text("topic").notNull(),
  keyName: text("key_name").notNull(),
  keyType: text("key_type").notNull(), // 'number', 'string', 'boolean'
  lastValue: text("last_value"),
  valueCount: int("value_count").notNull().default(0),
  firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
});

export const deviceLocations = mysqlTable("device_locations", {
  id: int("id").primaryKey().autoincrement(),
  deviceId: text("device_id").notNull().unique(),
  name: text("name").notNull(),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  description: text("description"),
  deviceType: text("device_type"),
  connectionId: int("connection_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertConnectionSchema = createInsertSchema(mqttConnections).omit({
  id: true,
  createdAt: true,
});

export const insertTopicSchema = createInsertSchema(mqttTopics).omit({
  id: true,
  messageCount: true,
  lastMessageAt: true,
});

export const insertMessageSchema = createInsertSchema(mqttMessages).omit({
  id: true,
  timestamp: true,
});

export const insertTopicKeySchema = createInsertSchema(topicKeys).omit({
  id: true,
  firstSeenAt: true,
  lastSeenAt: true,
});

export const insertDeviceLocationSchema = createInsertSchema(deviceLocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MqttConnection = typeof mqttConnections.$inferSelect;
export type InsertMqttConnection = z.infer<typeof insertConnectionSchema>;
export type MqttTopic = typeof mqttTopics.$inferSelect;
export type InsertMqttTopic = z.infer<typeof insertTopicSchema>;
export type MqttMessage = typeof mqttMessages.$inferSelect;
export type InsertMqttMessage = z.infer<typeof insertMessageSchema>;
export type TopicKey = typeof topicKeys.$inferSelect;
export type InsertTopicKey = z.infer<typeof insertTopicKeySchema>;
export type DeviceLocation = typeof deviceLocations.$inferSelect;
export type InsertDeviceLocation = z.infer<typeof insertDeviceLocationSchema>;

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: text("username").notNull(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;