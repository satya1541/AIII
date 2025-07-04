import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '@shared/schema';

// MySQL connection configuration
const connectionConfig = {
  host: '98.130.73.141',
  user: 'satya',
  password: 'satya123',
  database: 'mqtt_db',
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(connectionConfig);

// Create Drizzle instance
export const db = drizzle(pool, { schema, mode: 'default' });

// Test database connection
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('MySQL database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('MySQL connection failed:', error);
    return false;
  }
}

// Migrate profile_image_url column to LONGTEXT
export async function migrateProfileImageColumn() {
  try {
    const connection = await pool.getConnection();
    await connection.execute('ALTER TABLE users MODIFY COLUMN profile_image_url LONGTEXT');
    connection.release();
    console.log('Successfully migrated profile_image_url column to LONGTEXT');
    return true;
  } catch (error) {
    console.error('Failed to migrate profile_image_url column:', error);
    return false;
  }
}

// Initialize database tables
export async function initializeTables() {
  try {
    // Create tables one by one to handle MySQL version compatibility
    const tables = [
      {
        name: 'mqtt_connections',
        sql: `CREATE TABLE IF NOT EXISTS mqtt_connections (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          broker_url VARCHAR(500) NOT NULL,
          port INT NOT NULL DEFAULT 8000,
          protocol VARCHAR(10) NOT NULL DEFAULT 'ws',
          client_id VARCHAR(255) NOT NULL,
          username VARCHAR(255),
          password VARCHAR(255), 
          use_auth BOOLEAN NOT NULL DEFAULT FALSE,
          is_connected BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'mqtt_topics',
        sql: `CREATE TABLE IF NOT EXISTS mqtt_topics (
          id INT AUTO_INCREMENT PRIMARY KEY,
          connection_id INT NOT NULL,
          topic VARCHAR(500) NOT NULL,
          qos INT NOT NULL DEFAULT 0,
          is_subscribed BOOLEAN NOT NULL DEFAULT TRUE,
          message_count INT NOT NULL DEFAULT 0,
          last_message_at TIMESTAMP NULL
        )`
      },
      {
        name: 'mqtt_messages',
        sql: `CREATE TABLE IF NOT EXISTS mqtt_messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          connection_id INT NOT NULL,
          topic VARCHAR(500) NOT NULL,
          payload LONGTEXT NOT NULL,
          qos INT NOT NULL DEFAULT 0,
          retain BOOLEAN NOT NULL DEFAULT FALSE,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          extracted_keys JSON,
          latitude TEXT,
          longitude TEXT,
          device_id TEXT
        )`
      },
      {
        name: 'topic_keys',
        sql: `CREATE TABLE IF NOT EXISTS topic_keys (
          id INT AUTO_INCREMENT PRIMARY KEY,
          topic VARCHAR(500) NOT NULL,
          key_name VARCHAR(255) NOT NULL,
          key_type VARCHAR(50) NOT NULL,
          \`last_value\` LONGTEXT,
          value_count INT NOT NULL DEFAULT 0,
          first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE INDEX unique_topic_key (topic(255), key_name)
        )`
      },
      
      {
        name: 'users',
        sql: `CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          email VARCHAR(100) UNIQUE,
          password VARCHAR(255) NOT NULL,
          first_name VARCHAR(50),
          last_name VARCHAR(50),
          profile_image_url LONGTEXT,
          role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'device_locations',
        sql: `CREATE TABLE IF NOT EXISTS device_locations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          device_id VARCHAR(255) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          latitude VARCHAR(50) NOT NULL,
          longitude VARCHAR(50) NOT NULL,
          description TEXT,
          device_type VARCHAR(100),
          connection_id INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`
      }
    ];

    for (const table of tables) {
      try {
        await pool.execute(table.sql);
        console.log(`Table ${table.name} created/verified successfully`);
      } catch (tableError) {
        console.error(`Error creating table ${table.name}:`, tableError);
        // Continue with other tables even if one fails
      }
    }

    // Add missing columns to existing tables one by one
    const mqttMessageColumns = [
      { name: 'latitude', type: 'TEXT' },
      { name: 'longitude', type: 'TEXT' },
      { name: 'device_id', type: 'TEXT' }
    ];

    for (const column of mqttMessageColumns) {
      try {
        await pool.execute(`ALTER TABLE mqtt_messages ADD COLUMN ${column.name} ${column.type}`);
        console.log(`Added column ${column.name} to mqtt_messages table`);
      } catch (alterError: any) {
        if (alterError.code === 'ER_DUP_FIELDNAME') {
          console.log(`Column ${column.name} already exists in mqtt_messages table`);
        } else {
          console.error(`Error adding column ${column.name} to mqtt_messages:`, alterError);
        }
      }
    }

    // Add missing columns to users table
    const userColumns = [
      { name: 'email', type: 'VARCHAR(100) UNIQUE' },
      { name: 'first_name', type: 'VARCHAR(50)' },
      { name: 'last_name', type: 'VARCHAR(50)' },
      { name: 'profile_image_url', type: 'VARCHAR(255)' },
      { name: 'role', type: "ENUM('user', 'admin') NOT NULL DEFAULT 'user'" },
      { name: 'last_login_at', type: 'TIMESTAMP NULL' },
      { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
    ];

    for (const column of userColumns) {
      try {
        await pool.execute(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
        console.log(`Added column ${column.name} to users table`);
      } catch (alterError: any) {
        if (alterError.code === 'ER_DUP_FIELDNAME') {
          console.log(`Column ${column.name} already exists in users table`);
        } else {
          console.error(`Error adding column ${column.name} to users:`, alterError);
        }
      }
    }

    // Add missing columns to mqtt_connections table
    const connectionColumns = [
      { name: 'user_id', type: 'INT NOT NULL DEFAULT 1' }
    ];

    for (const column of connectionColumns) {
      try {
        await pool.execute(`ALTER TABLE mqtt_connections ADD COLUMN ${column.name} ${column.type}`);
        console.log(`Added column ${column.name} to mqtt_connections table`);
      } catch (alterError: any) {
        if (alterError.code === 'ER_DUP_FIELDNAME') {
          console.log(`Column ${column.name} already exists in mqtt_connections table`);
        } else {
          console.error(`Error adding column ${column.name} to mqtt_connections:`, alterError);
        }
      }
    }

    // Create default admin user if it doesn't exist
    try {
      console.log('Checking for existing admin user...');
      const [existingAdmin] = await pool.execute('SELECT id FROM users WHERE role = "admin" LIMIT 1');
      console.log('Admin check result:', existingAdmin);
      
      if (!existingAdmin || (existingAdmin as any[]).length === 0) {
        console.log('No admin user found, creating default admin...');
        // Create default admin user
        const bcrypt = await import('bcryptjs');
        const adminPassword = await bcrypt.hash('admin123', 10);
        
        await pool.execute(`
          INSERT INTO users (username, email, password, role, first_name, last_name) 
          VALUES ('admin', 'admin@mqtt-dashboard.com', ?, 'admin', 'System', 'Administrator')
        `, [adminPassword]);
        
        console.log('Default admin user created:');
        console.log('Username: admin');
        console.log('Password: admin123');
        console.log('Email: admin@mqtt-dashboard.com');
      } else {
        console.log('Admin user already exists');
      }
    } catch (adminError) {
      console.error('Error creating admin user:', adminError);
    }

    console.log('Database tables initialization completed');
    return true;
  } catch (error) {
    console.error('Failed to initialize database tables:', error);
    return false;
  }
}

export { pool };