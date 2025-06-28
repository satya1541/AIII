# MQTT Dashboard - Replit.md

## Overview

This is a full-stack MQTT dashboard application that provides real-time monitoring, analysis, and management of MQTT connections and messages. The application features an AI-powered insights system using OpenAI to analyze message patterns and detect anomalies in IoT data streams.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with custom dark theme
- **Build Tool**: Vite with hot module replacement
- **Real-time Updates**: WebSocket connection for live MQTT message streaming

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **WebSocket**: Built-in WebSocket server for real-time communication
- **MQTT Client**: mqtt.js library for broker connections
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: OpenAI GPT-4o for message analysis and insights
- **Session Management**: PostgreSQL session store

## Key Components

### Database Schema (Drizzle ORM)
- **mqtt_connections**: MQTT broker connection configurations
- **mqtt_topics**: Subscribed topics per connection
- **mqtt_messages**: Stored MQTT messages with metadata
- **ai_insights**: AI-generated insights and analysis results

### Core Services
- **MQTT Service**: Manages multiple broker connections, subscriptions, and message handling
- **OpenAI Service**: Analyzes messages for anomalies, patterns, and optimization opportunities
- **Storage Interface**: Abstraction layer for database operations with in-memory fallback

### Frontend Components
- **Dashboard**: Main interface with connection management and real-time monitoring
- **MQTT Connection**: Connection configuration and management
- **Message Monitor**: Real-time message display with filtering
- **Topic Manager**: Topic subscription management
- **AI Insights**: Display of AI-generated analysis and recommendations
- **Message Publisher**: Interface for publishing messages to topics
- **Analytics Chart**: Visual representation of message patterns and statistics

## Data Flow

1. **Connection Setup**: Users configure MQTT broker connections through the frontend
2. **Real-time Messaging**: MQTT messages flow through WebSocket to frontend for live updates
3. **Message Storage**: All messages are persisted to PostgreSQL database
4. **AI Analysis**: Messages are analyzed by OpenAI service for insights
5. **Dashboard Updates**: Real-time updates via WebSocket keep the dashboard current

## External Dependencies

### Core Dependencies
- **Database**: PostgreSQL (configured via DATABASE_URL)
- **AI Service**: OpenAI API (requires OPENAI_API_KEY)
- **MQTT Brokers**: Supports WebSocket and TCP connections to external brokers

### UI Libraries
- **Radix UI**: Headless UI components for accessibility
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **Chart.js**: Data visualization (planned integration)

### Development Tools
- **ESBuild**: Fast JavaScript bundler for production
- **TSX**: TypeScript execution for development
- **Drizzle Kit**: Database migrations and schema management

## Deployment Strategy

### Development
- **Command**: `npm run dev`
- **Features**: Hot reload, TypeScript compilation, WebSocket support
- **Port**: 5000 (configurable)

### Production Build
- **Frontend**: Vite builds optimized static assets
- **Backend**: ESBuild bundles server code with external packages
- **Database**: Drizzle migrations via `npm run db:push`

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API authentication
- `NODE_ENV`: Environment setting (development/production)

## Changelog

- June 26, 2025. Successfully implemented glassmorphic design with fully optimized dark/light mode:
  - Created comprehensive glassmorphic CSS with proper backdrop filters and transparent gradients
  - Implemented ThemeProvider with system theme detection and localStorage persistence
  - Optimized CSS variables for proper contrast in both light and dark modes
  - Updated all UI components to use new glassmorphic card styles with proper theme support
  - Added smooth transitions, hover effects, and enhanced visual hierarchy
  - Fixed all CSS syntax errors and removed duplicate styling rules
  - Integrated ThemeToggle component for seamless theme switching
  - Enhanced floating action button and sidebar with theme-aware styling
  - Fixed MQTT subscription display issue - topics now appear correctly after subscription
  - Resolved database duplicate topic entries with improved deduplication logic
  - Improved button visibility in dark mode with enhanced contrast and proper hover states
  - Fixed navigation tab styling for better visibility and user experience
  - Enhanced "Visualize data" functionality with proper navigation to analytics page
  - Fixed WebSocket connection status badge visibility with enhanced color contrast and shadows
  - Improved overall badge styling for better readability in dark mode
  - Resolved light mode visibility issues with enhanced glassmorphic styling and proper contrast
  - Fixed advanced analytics charts to properly render MQTT data with improved data processing
  - Enhanced chart components with theme-aware colors and better error handling
- June 28, 2025. Advanced analytics and UI improvements:
  - Replaced Recharts with professional Chart.js implementation for accurate data visualization
  - Added four interactive chart types (Bar, Pie, Line, Scatter) with real MQTT data processing
  - Fixed all Badge visibility issues in dark mode with enhanced glassmorphic styling
  - Implemented proper error handling for empty data arrays to prevent runtime errors
  - Enhanced topic subscription workflow with automatic connection establishment
  - Added clear visual indicators for connection status and subscription requirements
  - Fixed Chart.js Filler plugin registration for proper line chart fill areas
- June 28, 2025. Geographic Mapping Integration implemented:
  - Added Google Maps integration with interactive device location visualization
  - Implemented Device Location Manager for manual device positioning
  - Created database schema for storing device locations and location-enabled messages
  - Added API routes for managing device locations and fetching location data
  - Built complete Maps page with connection/topic filtering and real-time device tracking
  - Added support for MQTT messages with latitude/longitude coordinates
  - Integrated multiple map view types (Road, Satellite, Hybrid) with interactive markers
  - Enhanced database schema to support geographic data in MQTT messages
- June 26, 2025. Successfully completed migration from Replit Agent to standard Replit environment:
  - Fixed all TypeScript compilation errors in MQTT service
  - Resolved unhandled promise rejection errors
  - Updated MQTT QoS type handling for proper TypeScript compatibility
  - Removed deprecated AI analysis fields from message schema
  - Enhanced error handling in API routes with proper error types
  - Application now runs cleanly without LSP or runtime errors
- January 25, 2025. Successfully migrated from Replit Agent to standard Replit environment
- January 25, 2025. Fixed MySQL database connection and table creation issues
- January 25, 2025. Resolved React component errors and WebSocket connection problems
- January 25, 2025. Added comprehensive error boundaries for stable application rendering
- June 25, 2025. Initial setup
- June 25, 2025. Completed migration from Replit Agent to standard Replit environment:
  - Fixed MySQL database connection and table syntax errors
  - Resolved React component rendering issues with error boundaries
  - Fixed SelectItem validation errors
  - Added graceful OpenAI API error handling
  - Configured OpenAI API key for AI insights functionality
  - Application now runs without critical errors

## User Preferences

Preferred communication style: Simple, everyday language.

## Migration Status

✓ Successfully migrated from Replit Agent to standard Replit environment
✓ All critical errors resolved and application stable
✓ OpenAI API configured for AI insights functionality
✓ MySQL database connection working properly
✓ June 28, 2025: Completed final migration verification - all systems running smoothly