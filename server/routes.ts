import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { mqttService } from "./services/mqtt";
import { insertConnectionSchema, insertTopicSchema, insertMessageSchema, loginSchema, registerSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import session from "express-session";

// Extend session data interface
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    user?: any;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Session configuration
  app.use(session({
    secret: 'mqtt-dashboard-secret-key', // In production, use environment variable
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Middleware to check authentication
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.session && req.session.userId) {
      return next();
    } else {
      return res.status(401).json({ error: 'Authentication required' });
    }
  };

  // Middleware to check admin role
  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      req.user = user;
      return next();
    } catch (error) {
      return res.status(500).json({ error: 'Failed to verify admin status' });
    }
  };

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    perMessageDeflate: false,
    maxPayload: 64 * 1024, // 64KB max payload
    clientTracking: true
  });

  // Keep track of active connections for cleanup
  const activeConnections = new Set<WebSocket>();

  wss.on('connection', (ws, req) => {
    activeConnections.add(ws);

    // Set ping/pong for connection health monitoring
    let pingInterval: NodeJS.Timeout;
    let pongReceived = true;

    const messageHandler = (message: any) => {
      console.log('WebSocket messageHandler received:', message);
      if (ws.readyState === WebSocket.OPEN) {
        try {
          const wsMessage = {
            type: 'mqtt_message',
            data: message
          };
          console.log('Sending WebSocket message:', wsMessage);
          ws.send(JSON.stringify(wsMessage));
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
          // Clean up on send error
          cleanup();
        }
      } else {
        console.log('WebSocket not ready, state:', ws.readyState);
      }
    };

    const cleanup = () => {
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      mqttService.offMessage(messageHandler);
      activeConnections.delete(ws);
    };

    mqttService.onMessage(messageHandler);

    // Send initial connection confirmation
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'connection_status',
          data: { connected: true, timestamp: new Date().toISOString() }
        }));
      }
    } catch (error) {
      console.error('Error sending initial connection confirmation:', error);
      cleanup();
      return;
    }

    // Start ping/pong heartbeat
    pingInterval = setInterval(() => {
      if (!pongReceived) {
        console.log('WebSocket client did not respond to ping, terminating connection');
        ws.terminate();
        return;
      }
      
      pongReceived = false;
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000); // 30 second intervals

    ws.on('pong', () => {
      pongReceived = true;
    });

    ws.on('close', (code, reason) => {
      console.log(`WebSocket client disconnected - code: ${code}, reason: ${reason}`);
      cleanup();
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      cleanup();
    });

    // Handle unexpected connection termination
    ws.on('unexpected-response', (req, res) => {
      console.error('WebSocket unexpected response:', res.statusCode);
      cleanup();
    });
  });

  // Graceful shutdown handler
  const gracefulShutdown = () => {
    console.log('Closing WebSocket connections...');
    activeConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Server shutting down');
      }
    });
    wss.close();
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  // Authentication Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = registerSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });

      // Set session
      req.session.userId = user.id;
      req.session.user = { id: user.id, username: user.username };

      // Return user without password and mark as first time
      const { password, ...userWithoutPassword } = user;
      res.json({ ...userWithoutPassword, isFirstTime: true });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ error: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const credentials = loginSchema.parse(req.body);
      
      const user = await storage.authenticateUser(credentials.username, credentials.password);
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Check if this is a first-time login (no previous lastLoginAt)
      const isFirstTime = !user.lastLoginAt;

      // Update last login timestamp
      await storage.updateLastLogin(user.id);

      // Set session
      req.session.userId = user.id;
      req.session.user = { id: user.id, username: user.username };

      // Return user without password and include first-time flag
      const { password, ...userWithoutPassword } = user;
      res.json({ ...userWithoutPassword, isFirstTime });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ error: error.message || "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      // Clear the session cookie
      res.clearCookie('connect.sid', {
        path: '/',
        httpOnly: true,
        secure: false // Set to true in production with HTTPS
      });
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Admin Routes - Access all user data
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const safeUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(safeUsers);
    } catch (error) {
      console.error('Failed to fetch all users:', error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/connections", requireAdmin, async (req, res) => {
    try {
      const connections = await storage.getAllConnections();
      res.json(connections);
    } catch (error) {
      console.error('Failed to fetch all connections:', error);
      res.status(500).json({ error: "Failed to fetch all connections" });
    }
  });

  app.get("/api/admin/messages", requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 1000;
      const messages = await storage.getMessages(undefined, limit);
      res.json(messages);
    } catch (error) {
      console.error('Failed to fetch all messages:', error);
      res.status(500).json({ error: "Failed to fetch all messages" });
    }
  });

  // Admin user management routes
  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const userData = registerSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user with admin-specified role
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        role: req.body.role || 'user'
      });

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Admin user creation error:", error);
      res.status(400).json({ error: error.message || "User creation failed" });
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Prevent deleting self
      if (userId === req.session.userId) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }

      // Check if user exists and get their role
      const userToDelete = await storage.getUser(userId);
      if (!userToDelete) {
        return res.status(404).json({ error: "User not found" });
      }

      // Prevent deleting last admin
      if (userToDelete.role === 'admin') {
        const allUsers = await storage.getAllUsers();
        const adminCount = allUsers.filter(u => u.role === 'admin').length;
        if (adminCount <= 1) {
          return res.status(400).json({ error: "Cannot delete the last admin user" });
        }
      }

      // Delete the user and all their data
      const success = await storage.deleteUser(userId);
      if (success) {
        res.json({ message: "User deleted successfully" });
      } else {
        res.status(500).json({ error: "Failed to delete user" });
      }
    } catch (error: any) {
      console.error("Admin user deletion error:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.patch("/api/admin/users/:id/role", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { role } = req.body;

      if (!role || !['user', 'admin'].includes(role)) {
        return res.status(400).json({ error: "Invalid role. Must be 'user' or 'admin'" });
      }

      // Prevent demoting self from admin
      if (userId === req.session.userId && role !== 'admin') {
        return res.status(400).json({ error: "Cannot change your own admin role" });
      }

      // Check if this would remove the last admin
      if (role === 'user') {
        const userToUpdate = await storage.getUser(userId);
        if (userToUpdate?.role === 'admin') {
          const allUsers = await storage.getAllUsers();
          const adminCount = allUsers.filter(u => u.role === 'admin').length;
          if (adminCount <= 1) {
            return res.status(400).json({ error: "Cannot demote the last admin user" });
          }
        }
      }

      // Update the user role
      const success = await storage.updateUserRole(userId, role);
      if (success) {
        res.json({ message: "User role updated successfully" });
      } else {
        res.status(500).json({ error: "Failed to update user role" });
      }
    } catch (error: any) {
      console.error("Admin role update error:", error);
      res.status(500).json({ error: "Failed to update user role" });
    }
  });

  app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const userData = req.body;
      
      // Validate the user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if username is being changed and if it conflicts
      if (userData.username && userData.username !== existingUser.username) {
        const userWithSameUsername = await storage.getUserByUsername(userData.username);
        if (userWithSameUsername) {
          return res.status(400).json({ error: "Username already exists" });
        }
      }

      // Update user profile via storage interface
      const success = await storage.updateUserProfile(userId, userData);
      if (success) {
        const updatedUser = await storage.getUser(userId);
        if (updatedUser) {
          const { password, ...userWithoutPassword } = updatedUser;
          res.json(userWithoutPassword);
        } else {
          res.status(500).json({ error: "Failed to retrieve updated user" });
        }
      } else {
        res.status(500).json({ error: "Failed to update user profile" });
      }
    } catch (error: any) {
      console.error("Admin update user error:", error);
      res.status(500).json({ error: "Failed to update user profile" });
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Prevent deletion of the last admin user
      const users = await storage.getAllUsers();
      const user = users.find(u => u.id === userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const adminUsers = users.filter(u => u.role === 'admin');
      if (user.role === 'admin' && adminUsers.length <= 1) {
        return res.status(400).json({ error: "Cannot delete the last admin user" });
      }

      const success = await storage.deleteUser(userId);
      if (success) {
        res.json({ message: "User deleted successfully" });
      } else {
        res.status(500).json({ error: "Failed to delete user" });
      }
    } catch (error: any) {
      console.error("Admin delete user error:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.delete("/api/admin/messages/clear", requireAdmin, async (req, res) => {
    try {
      const success = await storage.clearMessages();
      if (success) {
        res.json({ message: "All messages cleared successfully" });
      } else {
        res.status(500).json({ error: "Failed to clear messages" });
      }
    } catch (error: any) {
      console.error("Admin clear messages error:", error);
      res.status(500).json({ error: "Failed to clear messages" });
    }
  });

  // MQTT Connection Routes
  app.get("/api/connections", requireAuth, async (req, res) => {
    try {
      const connections = await storage.getConnections();
      res.json(connections);
    } catch (error) {
      console.error('Failed to fetch connections:', error);
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
  app.post("/api/connections/:id/connect", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid connection ID" });
      }
      
      console.log(`Connecting MQTT broker ${id} for real-time charts`);
      
      // Ensure clean connection by disconnecting first
      await mqttService.disconnect(id);
      
      const success = await mqttService.connect(id);
      
      if (success) {
        // Auto-subscribe to existing topics for real-time data
        const topics = await storage.getTopicsByConnection(id);
        for (const topic of topics) {
          if (topic.isSubscribed) {
            console.log(`Re-subscribing to topic: ${topic.topic} for real-time charts`);
            await mqttService.subscribe(id, topic.topic, topic.qos);
          }
        }
      }
      
      res.json({ success });
    } catch (error: any) {
      console.error("Connect error:", error);
      res.status(500).json({ 
        error: "Failed to connect to MQTT broker", 
        details: error.message 
      });
    }
  });

  app.post("/api/connections/:id/disconnect", requireAuth, async (req, res) => {
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

  app.post("/api/connections/:id/subscribe", requireAuth, async (req, res) => {
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

  app.post("/api/connections/:id/unsubscribe", requireAuth, async (req, res) => {
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

  app.post("/api/connections/:id/publish", requireAuth, async (req, res) => {
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

  // Message Management Routes
  app.delete("/api/messages", async (req, res) => {
    try {
      const connectionId = req.query.connectionId ? parseInt(req.query.connectionId as string) : undefined;
      const success = await storage.clearMessages(connectionId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear messages" });
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

      // Fetch all topics at once instead of looping
      const connectionIds = connections.map(c => c.id);
      const allTopicsPromises = connectionIds.map(id => storage.getTopicsByConnection(id));
      const topicsArrays = await Promise.all(allTopicsPromises);
      const allTopics = topicsArrays.flat();
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

  // AI Insights Route
  app.post('/api/ai/analyze', requireAuth, async (req, res) => {
    try {
      const { messages } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array is required' });
      }

      const { openAIService } = await import('./services/openai');
      
      if (!openAIService.isConfigured()) {
        return res.status(503).json({ 
          error: 'AI analysis not available',
          message: 'OpenAI API key not configured'
        });
      }

      const insights = await openAIService.analyzeMessages(messages);
      res.json({ insights });
    } catch (error: any) {
      console.error('AI analysis error:', error);
      res.status(500).json({ 
        error: 'Failed to analyze messages',
        message: error.message
      });
    }
  });



  return httpServer;
}