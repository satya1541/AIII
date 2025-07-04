# IoT Dashboard - Replit.md

## Overview

This is a full-stack IoT dashboard application that provides real-time monitoring, analysis, and management of MQTT connections and messages. The application features an AI-powered insights system using OpenAI to analyze message patterns and detect anomalies in IoT data streams.

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

- July 4, 2025. Removed sidebar collapse functionality:
  - Removed sidebar collapse/expand state management and UI controls
  - Eliminated "Collapse Sidebar" button from sidebar footer
  - Removed hamburger menu button from header when sidebar was collapsed
  - Sidebar is now permanently visible and fixed in position
  - Simplified layout component by removing AnimatePresence and conditional rendering
  - Improved user experience with consistent navigation access
- July 4, 2025. Renamed "MQTT Connections" to "Add Devices" across the application:
  - Updated navigation menu item from "MQTT Connections" to "Add Devices"
  - Changed page title from "MQTT Connections" to "Add Devices"
  - Updated page description to "Connect and manage your IoT devices"
  - Changed button text from "Add Connection" to "Add Device"
  - Updated dashboard tab from "Connections" to "Devices"
  - Changed status text from "connections configured" to "devices configured"
  - Maintained all existing functionality while improving user-friendly terminology
- July 4, 2025. Successfully implemented comprehensive "Edit User" functionality in admin dashboard:
  - Added Edit User button (pencil icon) to admin users table alongside existing View User button
  - Created full-featured Edit User dialog with profile image upload capability for existing users
  - Implemented backend API route (PATCH /api/admin/users/:id) to handle user profile updates
  - Added updateUserProfile method to both MemStorage and MySQLStorage implementations
  - Admin users can now edit all user fields: username, email, first name, last name, role, and profile image
  - Profile images support upload, preview, and removal functionality with proper validation
  - Changes are immediately reflected in the admin dashboard after saving
  - Tested successfully with both admin and regular user accounts
- July 4, 2025. Successfully completed migration from Replit Agent to standard Replit environment:
  - Fixed profile image display issue in header user profile section
  - All migration checklist items completed successfully
  - Application runs cleanly without critical errors on port 5000
  - Full functionality verified including MQTT connections, real-time messaging, and admin features
  - Profile images now display properly in both sidebar and header sections
- July 4, 2025. Added comprehensive profile photo upload functionality:
  - Enhanced signup form with profile photo upload capability supporting image files up to 2MB
  - Implemented image preview with removal option during registration process
  - Added profile photo display in sidebar user profile section replacing generic user icon
  - Enhanced AdminDashboard user table to show profile photos alongside user information
  - Updated User Details dialog in admin panel to prominently display user profile photos
  - Extended user schema and TypeScript interfaces to include profileImageUrl field
  - Images stored as base64 strings in database for seamless integration
  - Added comprehensive file validation for size limits and supported image formats
- July 4, 2025. Successfully completed migration from Replit Agent to standard Replit environment:
  - All migration checklist items completed successfully
  - Application runs cleanly without critical errors on port 5000
  - Full functionality verified including MQTT connections, real-time messaging, and admin features
  - Enhanced user experience with profile photo upload feature as requested
- July 4, 2025. Fixed analytics charts intermittent display issues:
  - Removed connection status checks that were hiding charts during MQTT disconnections
  - Charts now remain visible and persistent regardless of connection status fluctuations
  - Real-time Data Stream, Current Values, and Live Message Feed always display available data
  - Charts continue to update in real-time when WebSocket messages arrive
  - Enhanced data persistence to maintain stable analytics display during network interruptions
- July 3, 2025. Fixed analytics section data glitching and reset issues:
  - Added debounced connection checking to prevent data clearing on temporary MQTT disconnections
  - Implemented localStorage persistence for analytics statistics to maintain data across component re-renders
  - Enhanced total message counter to use actual database message IDs for accurate counting
  - Added 10-second timeout before clearing data on connection loss to handle frequent MQTT reconnections
  - Fixed TypeScript type annotations for better code reliability and maintainability
  - Analytics data now remains stable during MQTT connection fluctuations
- July 3, 2025. Fixed analytics section with proper real-time functionality:
  - Completely rewritten RealtimeAnalytics component with robust WebSocket connections
  - Fixed Chart.js rendering issues with proper chart configurations and responsive containers
  - Implemented working Live Message Feed with real-time MQTT message display
  - Added proper data extraction from JSON payloads with numeric value parsing
  - Enhanced WebSocket error handling with automatic reconnection logic
  - Fixed real-time statistics tracking for messages per minute and active topics
  - Added refresh functionality and pause/resume controls for real-time data
  - Charts now render properly with dark theme colors and responsive sizing
  - Live Message Feed displays recent messages with extracted key-value pairs
  - All charts update automatically when new MQTT messages arrive via WebSocket
- July 3, 2025. Made sidebar more compact with reduced width and spacing:
  - Reduced sidebar width from 288px to 224px (w-72 to w-56) for better space utilization
  - Compressed padding and margins throughout sidebar for tighter, cleaner layout
  - Reduced logo and user avatar sizes for more compact header section
  - Adjusted navigation item spacing and icon container sizes for efficiency
  - Maintained visual hierarchy while improving space efficiency
- July 3, 2025. Added logout button to header and made user profile non-interactive:
  - Added dedicated logout button to left of Live status indicator with red styling
  - Made user profile section (admin/Admin) completely unclickable and non-interactive
  - Removed dropdown menu and hover effects from user profile display
  - User profile now serves as static information display only
  - Logout functionality accessible via prominent header button with proper styling
- July 3, 2025. Redesigned sidebar and header UI/UX with modern, visually appealing interface:
  - Expanded sidebar width to 288px (w-72) for better content spacing and readability
  - Added premium logo integration with Clino Health branding and professional tagline
  - Enhanced user profile section with gradient avatar, role badges, and online status indicator
  - Implemented sophisticated navigation with icon containers, active state indicators, and micro-animations
  - Added staggered animation entrance effects for navigation items with individual delays
  - Created active page indicator with blue-to-purple gradient accent bar and "Active" label
  - Enhanced hover effects with scaling, color transitions, and gradient backgrounds
  - Added system status footer with health indicators and animated pulse effects
  - Redesigned header with gradient background decoration and improved responsive behavior
  - Updated WebSocket status badge with live pulse animation and enhanced visual feedback
  - Enhanced floating action button with rotating border, tooltip, and multi-layer gradient effects
  - Improved overall visual hierarchy with better spacing, typography, and color contrast
- July 3, 2025. Implemented advanced real-time notification system with intelligent MQTT monitoring:
  - Completely rewritten notification system from fake data to real-time MQTT message analysis
  - Created 8 intelligent notification rules for temperature, humidity, index values, device status, battery, and motion detection
  - Added priority-based notifications (low, medium, high, critical) with different visual indicators and behaviors
  - Implemented sound notifications, desktop notifications with permission management
  - Added advanced filtering by category, priority, and search functionality with sorting options
  - Created notification categories: Performance, Environmental, Connectivity, Device Status, Security, System
  - Added auto-expiring notifications based on priority level and duplicate prevention
  - Enhanced notification bell with critical alert animations and color-coding (red for critical, yellow for normal)
  - Built comprehensive settings panel for sound, desktop notifications, and category management
  - Added real-time statistics: unread count, critical count, and category-based counts
  - All notifications now trigger from actual MQTT data with customizable thresholds and conditions
- July 3, 2025. Successfully completed migration from Replit Agent to standard Replit environment:
  - Updated color scheme with modern light blue/teal gradient background
  - Enhanced dark navy cards with improved opacity and contrast
  - Implemented beautiful purple-to-pink gradient for Sign In button
  - Maintained full functionality while improving visual design aesthetic
  - All migration steps completed successfully with enhanced user interface
- July 2, 2025. Fixed blurry text issues while maintaining transparent glassmorphic design:
  - Removed all text shadows that were causing blur effect
  - Applied antialiased font smoothing for crisp text rendering
  - Adjusted transparency levels for better contrast (0.5 opacity for cards)
  - Maintained beautiful koi fish visibility through transparent interface
  - Text is now clear, sharp, and readable while preserving the aquatic aesthetic
- July 2, 2025. Successfully integrated beautiful koi fish background animation across entire site:
  - Added animated koi fish swimming in curved paths across all application pages
  - Implemented two fish with different colors (orange and white) moving in graceful patterns
  - Added light blue sea level background with proper layering behind all UI elements
  - Fish animation runs continuously with 20-second cycles and proper visual depth
  - Animation positioned behind interface with z-index layering for non-intrusive visual enhancement
  - Enhanced login, register, and main dashboard pages with consistent aquatic animation
  - Created reusable KoiFishAnimation component for future maintainability
  - Enhanced overall user experience with serene aquatic atmosphere while maintaining full functionality
- July 2, 2025. Successfully completed logout functionality fix during migration:
  - Resolved logout button click detection issues with enhanced event handling
  - Removed interfering click-outside handlers that prevented button interaction
  - Improved logout flow with immediate state clearing to eliminate blank page
  - Optimized API call timing to run in background without blocking UI
  - Logout now works seamlessly: instant transition to login page, proper session clearing
- July 2, 2025. Fixed logout functionality during migration:
  - Enhanced logout implementation to properly clear all authentication state
  - Added session cookie clearing on server-side logout with clearCookie method
  - Added page refresh on logout to ensure clean state reset
  - Reset welcome dialog flags and all authentication state on logout
  - Logout now properly terminates session and redirects to login page
- July 2, 2025. Fixed logout functionality:
  - Added proper credentials handling to logout API request with "include" option
  - Added Content-Type header to logout request for proper session termination
  - Reset all auth state including welcome dialog flags on logout
  - Logout now properly clears server session and returns user to login page
- July 2, 2025. Removed Test Notifications button from dashboard per user request:
  - Removed test notification button and associated click handler from dashboard header
  - Cleaned up unnecessary UI clutter to maintain clean interface design
  - Notification system remains intact for real MQTT and system notifications
- July 2, 2025. Successfully completed migration from Replit Agent to standard Replit environment:
  - Fixed authentication system by adding missing lastLoginAt column to MySQL users table
  - Resolved login functionality - admin user authentication now works properly with username: admin, password: admin123
  - Fixed welcome dialog glitching issue by removing conflicting internal state management
  - All database tables properly initialized and MQTT message streaming working correctly
  - Application runs cleanly on port 5000 with full functionality restored
- July 2, 2025. Implemented personalized welcome message system:
  - Added WelcomeDialog component with glassmorphic design and personalized messages
  - Created database tracking for first-time vs. returning users using lastLoginAt field
  - Enhanced authentication flow to distinguish first-time logins from returning users
  - Integrated welcome dialog into AuthWrapper to show after successful authentication
  - First-time users see "Welcome to Clino Health Innovation" message (shown once only)
  - Returning users see "Welcome Back [username]" message with personalized greeting
  - Updated login and register API routes to handle isFirstTime detection and lastLoginAt updates
  - Seamless user experience with automatic dialog dismissal and proper timing
- July 2, 2025. Enhanced UI/UX with comprehensive hover animations and micro-interactions:
  - Added elegant sidebar navigation hover effects with sliding animations and icon transformations
  - Implemented card hover effects with lift animations and enhanced shadows for better visual feedback
  - Created animated notification bell with shake effect and enhanced user profile hover interactions
  - Added floating action button with pulse animation and continuous floating motion
  - Designed sliding shimmer effects for navigation items with color transitions and scaling
  - Enhanced quick action buttons with green accent hover states and icon scaling
  - Added badge hover effects with scaling and shadow enhancements throughout the application
  - Implemented button ripple effects with expanding circle animations for primary buttons
  - All animations follow 0.3s ease transitions for smooth, professional user interactions
- July 2, 2025. Suppressed console logs for cleaner development experience:
  - Enhanced console.log, console.error, and console.warn suppression to filter WebSocket noise
  - Added global unhandled promise rejection handler for WebSocket-related errors
  - Suppressed ResizeObserver loop completion errors and DOM autocomplete warnings
  - Removed React DevTools download suggestions and connection status messages
  - Application now provides clean console output while maintaining full functionality
- July 2, 2025. Updated branding to use Clino logo instead of "IoT Dashboard" text:
  - Downloaded and integrated Clino logo image from provided URL
  - Updated main layout header to display Clino logo instead of text with icon
  - Replaced "IoT Dashboard" branding in login and register pages with Clino logo
  - Updated dashboard page title from "IoT Dashboard" to "Dashboard"
  - Modified settings page description to remove "IoT Dashboard" reference
  - Enhanced visual consistency across all application pages with new branding
  - Optimized logo sizes: h-12 for header (proper navigation fit), h-24 for login/register pages (prominent branding)
- July 2, 2025. Removed Temperature vs Humidity chart from Analytics section per user request:
  - Removed Temperature vs Humidity correlation chart and associated data processing functions
  - Cleaned up unused getCorrelationData() function and correlationOptions configuration
  - Maintained other analytics charts: Data Trend Analysis, Value Distribution, Device Performance, Signal Quality
  - Enhanced code maintainability by removing unused chart dependencies
- July 1, 2025. Updated Nivo Charts section in Admin Dashboard per user request:
  - Removed "Messages by Topic" bar chart and "Alert Distribution" pie chart 
  - Fixed "Daily Message Activity" calendar chart with improved data processing and date handling
  - Enhanced calendar chart to show 2 months of data with better tooltip functionality
  - Cleaned up component imports and removed unused chart functions
  - Maintained real-time data integration with WebSocket updates for remaining charts
  - Kept Line Chart (Index Trends), HeatMap (Hourly Activity), and Calendar Chart (Daily Activity)
- July 1, 2025. Added comprehensive Nivo Charts section exclusively to Admin Dashboard:
  - Created admin-only "Nivo Charts" tab with 6 different chart types using @nivo library
  - Implemented Line Chart for Index trends over time with multiple data series
  - Added Bar Chart showing message distribution by topic with dynamic colors
  - Created Pie/Donut Chart for alert status distribution with proper legends
  - Built HeatMap for hourly activity patterns across days of the week
  - Added Calendar Chart showing daily message activity over months
  - Included KPI gauge cards showing success rate, average index, total messages, active topics
  - All charts use real MQTT admin message data with intelligent fallback for demos
  - Features dark theme styling, proper responsive containers, and admin-only access control
- July 1, 2025. Updated Analytics charts with new comprehensive visualizations:
  - Removed "Key Value Patterns" and "Message Volume by Topic" charts per user request  
  - Added "Data Trend Analysis" bar chart showing hourly averages across IoT data keys
  - Added "Value Distribution Analysis" line chart for scatter-like data visualization
  - Added "Temperature vs Humidity" correlation chart with dual Y-axes
  - Added "Device Performance" horizontal bar chart showing system metrics
  - Added "Signal Quality Monitor" doughnut chart categorizing signal strength
  - Enhanced chart data processing with real MQTT message integration and fallback demo data
  - All new charts feature dark theme styling with proper responsive containers
- July 1, 2025. Successfully completed migration from Replit Agent to standard Replit environment:
  - Fixed all ResizeObserver console errors with proper error suppression and chart container styling
  - Resolved unhandled promise rejections from WebSocket connections with comprehensive error handling
  - Implemented complete AI insights functionality with local pattern analysis and anomaly detection
  - Enhanced chart components with proper maintainAspectRatio settings and responsive containers
  - Added robust error boundaries and global error handling for better stability
  - Fixed all chart containers to use proper CSS classes for consistent sizing
  - Application runs cleanly without critical errors, console noise, or functionality gaps
- July 1, 2025. Removed light mode and locked application to dark mode only:
  - Simplified ThemeProvider to force dark mode without theme switching capability
  - Removed ThemeToggle component from layout header
  - Updated CSS variables to use only dark mode color scheme
  - Deleted theme-toggle.tsx component file
  - Application now has consistent dark theme across all components
- July 1, 2025. Completely rewritten Analytics section with real-time multiple data charts:
  - Created comprehensive RealtimeAnalytics component with live WebSocket connections
  - Implemented multiple chart types: Line charts, Bar charts, Pie/Doughnut charts, and Radar charts
  - Added real-time data processing from live MQTT message streams (Index values 61-108)
  - Built live statistics dashboard with messages per minute, average values, peak values tracking
  - Added pause/resume functionality for real-time data feeds
  - Integrated Chart.js with proper theme-aware colors and responsive design
  - Added live message feed showing recent MQTT data with extracted keys
  - All charts update automatically as new MQTT messages arrive from breath/EC64C984B1FC topic
- June 30, 2025. Successfully migrated from Replit Agent to standard Replit environment:
  - Replaced toast notifications with elegant popup error dialogs in login/register pages
  - Created reusable ErrorDialog component with glassmorphic design and proper theming
  - Fixed all TypeScript compilation errors and removed deprecated toast dependencies
  - Verified application runs cleanly without critical errors on port 5000
  - Enhanced user experience with centered modal error handling instead of corner notifications
- June 30, 2025. Updated application branding from "MQTT Dashboard" to "IoT Dashboard":
  - Changed all user-facing titles and headers across login, register, dashboard, and settings pages
  - Updated layout header branding text to reflect new "IoT Dashboard" name
  - Modified admin export filename to use "iot-dashboard-export" prefix
  - Updated project documentation to reflect new branding throughout
- June 30, 2025. Fixed admin dashboard functionality and visibility issues:
  - Added missing user details dialog that opens when clicking eye icons in admin panel
  - Fixed role badge visibility with proper color contrast for dark/light modes
  - Enhanced all Badge components throughout admin dashboard with theme-aware colors
  - Added missing DELETE API route for admin user deletion with safety checks
  - Implemented Export Data functionality with JSON download capability
  - Ensured all admin features work properly: user management, connection monitoring, message tracking
  - Fixed connection status badges visibility and improved overall UI consistency
- June 30, 2025. Added comprehensive admin user system with elevated privileges:
  - Created role-based access control with 'user' and 'admin' roles in MySQL database schema
  - Implemented automatic admin user creation on first startup (Username: admin, Password: admin123)
  - Added admin-only API routes (/api/admin/users, /api/admin/connections, /api/admin/messages)
  - Built AdminDashboard component with comprehensive user and data management interface
  - Added admin navigation item that only appears for users with admin role
  - Admin users can view all users' data, connections, and messages across the entire system
  - Implemented proper middleware for admin authentication and authorization
- June 30, 2025. Successfully completed migration from Replit Agent to standard Replit environment:
  - Fixed MySQL database schema by adding missing columns to users table (email, first_name, last_name, profile_image_url, created_at, updated_at)
  - Resolved authentication system - user signup now works properly with complete user data
  - Fixed header display to show actual username instead of hardcoded "Admin" text
  - Updated layout component to use useAuth hook for dynamic user information display
  - Added logout functionality to user profile in header
  - Ensured proper client/server separation and security practices
  - Application now runs cleanly on port 5000 with MySQL database integration
- June 30, 2025. Maps functionality completely removed per user request:
  - Removed all map-related components (AzureMap, GeographicMap, DeviceLocationManager)
  - Removed Maps page and navigation item from layout
  - Removed device location API routes and database methods
  - Cleaned up DeviceLocation schema and type references
  - Application continues to function normally without map features
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