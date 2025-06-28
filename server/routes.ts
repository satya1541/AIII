import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { mqttService } from "./services/mqtt";
import { insertConnectionSchema, insertTopicSchema, insertMessageSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    const messageHandler = (message: any) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'mqtt_message',
          data: message
        }));
      }
    };

    mqttService.onMessage(messageHandler);

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      mqttService.offMessage(messageHandler);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      mqttService.offMessage(messageHandler);
    });
  });

  // MQTT Connection Routes
  app.get("/api/connections", async (req, res) => {
    try {
      const connections = await storage.getConnections();
      res.json(connections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch connections" });
    }
  });

  app.post("/api/connections", async (req, res) => {
    try {
      const connectionData = insertConnectionSchema.parse(req.body);
      const connection = await storage.createConnection(connectionData);
      res.json(connection);
    } catch (error: any) {
      console.error('Connection creation error:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ 
          error: "Invalid connection data", 
          details: error.errors 
        });
      } else {
        res.status(500).json({ 
          error: "Failed to create connection",
          message: error.message || "Unknown error"
        });
      }
    }
  });

  app.put("/api/connections/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const connection = await storage.updateConnection(id, updates);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }
      res.json(connection);
    } catch (error) {
      res.status(400).json({ error: "Failed to update connection" });
    }
  });

  app.delete("/api/connections/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await mqttService.disconnect(id);
      const deleted = await storage.deleteConnection(id);
      if (!deleted) {
        return res.status(404).json({ error: "Connection not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete connection error:", error);
      res.status(500).json({ error: "Failed to delete connection", details: error?.message || "Unknown error" });
    }
  });

  // MQTT Operation Routes
  app.post("/api/connections/:id/connect", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid connection ID" });
      }
      const success = await mqttService.connect(id);
      res.json({ success });
    } catch (error: any) {
      console.error("Connect error:", error);
      res.status(500).json({ 
        error: "Failed to connect to MQTT broker", 
        details: error.message 
      });
    }
  });

  app.post("/api/connections/:id/disconnect", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid connection ID" });
      }
      const success = await mqttService.disconnect(id);
      res.json({ success });
    } catch (error: any) {
      console.error("Disconnect error:", error);
      res.status(500).json({ 
        error: "Failed to disconnect from MQTT broker", 
        details: error.message 
      });
    }
  });

  app.post("/api/connections/:id/subscribe", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid connection ID" });
      }

      const { topic, qos = 0 } = req.body;

      if (!topic || topic.trim() === '') {
        return res.status(400).json({ error: "Topic is required" });
      }

      const connection = await storage.getConnection(id);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      // Check if topic already exists, update or create
      const existingTopics = await storage.getTopicsByConnection(id);
      const existingTopic = existingTopics.find(t => t.topic === topic.trim());
      
      if (existingTopic) {
        await storage.updateTopic(existingTopic.id, {
          qos: qos,
          isSubscribed: true
        });
      } else {
        await storage.createTopic({
          connectionId: id,
          topic: topic.trim(),
          qos: qos,
          isSubscribed: true
        });
      }

      const success = await mqttService.subscribe(id, topic, qos);
      res.json({ success, topic, qos });
    } catch (error: any) {
      console.error("Subscribe error:", error);
      res.status(500).json({ 
        error: "Failed to subscribe to topic",
        details: error.message || "Unknown error"
      });
    }
  });

  app.post("/api/connections/:id/unsubscribe", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid connection ID" });
      }

      const { topic } = req.body;
      if (!topic || topic.trim() === '') {
        return res.status(400).json({ error: "Topic is required" });
      }

      // Update topic record to mark as unsubscribed
      const existingTopics = await storage.getTopicsByConnection(id);
      const existingTopic = existingTopics.find(t => t.topic === topic.trim());
      
      if (existingTopic) {
        await storage.updateTopic(existingTopic.id, {
          isSubscribed: false
        });
      }

      const success = await mqttService.unsubscribe(id, topic);
      res.json({ success, topic });
    } catch (error: any) {
      console.error("Unsubscribe error:", error);
      res.status(500).json({ 
        error: "Failed to unsubscribe from topic",
        details: error.message || "Unknown error"
      });
    }
  });

  app.post("/api/connections/:id/publish", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid connection ID" });
      }

      const { topic, payload, qos = 0, retain = false } = req.body;
      
      if (!topic || topic.trim() === '') {
        return res.status(400).json({ error: "Topic is required" });
      }
      
      if (payload === undefined || payload === null) {
        return res.status(400).json({ error: "Payload is required" });
      }

      const success = await mqttService.publish(id, topic, payload, qos, retain);
      res.json({ success, topic, payload, qos, retain });
    } catch (error: any) {
      console.error("Publish error:", error);
      res.status(500).json({ 
        error: "Failed to publish message",
        details: error.message || "Unknown error"
      });
    }
  });

  // Topic Routes
  app.get("/api/connections/:id/topics", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const topics = await storage.getTopicsByConnection(id);
      res.json(topics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch topics" });
    }
  });

  // Message Routes
  app.get("/api/messages", async (req, res) => {
    try {
      const connectionId = req.query.connectionId ? parseInt(req.query.connectionId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const messages = await storage.getMessages(connectionId, limit);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.get("/api/messages/topic/:topic", async (req, res) => {
    try {
      const topic = decodeURIComponent(req.params.topic);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const messages = await storage.getMessagesByTopic(topic, limit);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages by topic" });
    }
  });

  app.get("/api/topics/:topic/keys", async (req, res) => {
    try {
      const topic = decodeURIComponent(req.params.topic);
      const keys = await storage.getTopicKeys(topic);
      res.json(keys);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch topic keys" });
    }
  });

  app.get("/api/topics/:topic/keys/:keyName/values", async (req, res) => {
    try {
      const topic = decodeURIComponent(req.params.topic);
      const keyName = decodeURIComponent(req.params.keyName);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const values = await storage.getKeyValues(topic, keyName, limit);
      res.json(values);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch key values" });
    }
  });

  // Statistics Routes
  app.get('/api/stats', async (req, res) => {
    try {
      const connections = await storage.getConnections();
      const activeConnections = connections.filter(c => c.isConnected).length;

      const messages = await storage.getMessages(undefined, 1000);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const messagesToday = messages.filter(m => m.timestamp >= today).length;

      const allTopics = [];
      for (const connection of connections) {
        const topics = await storage.getTopicsByConnection(connection.id);
        allTopics.push(...topics);
      }
      const activeTopics = allTopics.filter(t => t.isSubscribed).length;

      res.json({
        activeConnections,
        messagesTotal: messagesToday,
        activeTopics,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  // Device Location Routes
  app.get("/api/device-locations", async (req, res) => {
    try {
      const connectionId = req.query.connectionId ? parseInt(req.query.connectionId as string) : undefined;
      const deviceLocations = await storage.getDeviceLocations(connectionId);
      res.json(deviceLocations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch device locations" });
    }
  });

  app.get("/api/device-locations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deviceLocation = await storage.getDeviceLocation(id);
      if (!deviceLocation) {
        return res.status(404).json({ error: "Device location not found" });
      }
      res.json(deviceLocation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch device location" });
    }
  });

  app.post("/api/device-locations", async (req, res) => {
    try {
      const deviceLocation = await storage.createDeviceLocation(req.body);
      res.status(201).json(deviceLocation);
    } catch (error) {
      res.status(500).json({ error: "Failed to create device location" });
    }
  });

  app.patch("/api/device-locations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deviceLocation = await storage.updateDeviceLocation(id, req.body);
      if (!deviceLocation) {
        return res.status(404).json({ error: "Device location not found" });
      }
      res.json(deviceLocation);
    } catch (error) {
      res.status(500).json({ error: "Failed to update device location" });
    }
  });

  app.delete("/api/device-locations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteDeviceLocation(id);
      if (!success) {
        return res.status(404).json({ error: "Device location not found" });
      }
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete device location" });
    }
  });

  app.get("/api/messages-with-location", async (req, res) => {
    try {
      const connectionId = req.query.connectionId ? parseInt(req.query.connectionId as string) : undefined;
      const topic = req.query.topic as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const messages = await storage.getMessagesWithLocation(connectionId, topic, limit);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages with location" });
    }
  });

  return httpServer;
}