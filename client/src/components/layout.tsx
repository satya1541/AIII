import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  Network, 
  BarChart3,
  Plug, 
  MessageSquare,
  MapPin, 
  List, 
  Settings,
  TrendingUp,
  Bell,
  User,
  Activity,
  Zap,
  Menu,
  X,
  AlertCircle,
  CheckCircle,
  Info,
  Trash2,
  Check
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [location, setLocation] = useLocation();
  const [notifications, setNotifications] = useState([
    { id: 1, message: "MQTT connection established", type: "success", timestamp: new Date(), read: false },
    { id: 2, message: "High message volume detected", type: "warning", timestamp: new Date(), read: false }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread' | 'error' | 'warning' | 'success' | 'info'>('all');
  const notificationRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();



  // Real-time MQTT notifications via WebSocket with enhanced functionality
  const { isConnected: wsConnected } = useWebSocket('/ws', (message) => {
    if (message.type === 'mqtt_message') {
      const messageData = message.data;
      
      // Create smart notification based on message content
      let notificationType: "info" | "success" | "warning" | "error" = "info";
      let notificationMessage = `New message on topic: ${messageData.topic}`;
      
      // Analyze message for important patterns
      try {
        const payload = JSON.parse(messageData.payload);
        
        // Check for error conditions
        if (payload.error || payload.status === 'error' || messageData.topic.includes('error')) {
          notificationType = "error";
          notificationMessage = `Error detected on ${messageData.topic}: ${payload.error || payload.message || 'Unknown error'}`;
        }
        // Check for warnings
        else if (payload.warning || payload.status === 'warning' || payload.level === 'warning') {
          notificationType = "warning";
          notificationMessage = `Warning on ${messageData.topic}: ${payload.warning || payload.message || 'Check required'}`;
        }
        // Check for successful operations
        else if (payload.success || payload.status === 'success' || payload.status === 'connected') {
          notificationType = "success";
          notificationMessage = `Success on ${messageData.topic}: ${payload.message || 'Operation completed'}`;
        }
        // Check for sensor readings with thresholds
        else if (payload.temperature && payload.temperature > 80) {
          notificationType = "warning";
          notificationMessage = `High temperature alert: ${payload.temperature}°C on ${messageData.topic}`;
        }
        else if (payload.humidity && payload.humidity > 90) {
          notificationType = "warning";
          notificationMessage = `High humidity alert: ${payload.humidity}% on ${messageData.topic}`;
        }
        // High message volume detection
        else if (messageData.topic.includes('high_volume') || payload.count > 100) {
          notificationType = "warning";
          notificationMessage = `High message volume detected on ${messageData.topic}`;
        }
      } catch (e) {
        // Non-JSON payload, use basic notification
        if (messageData.payload.toLowerCase().includes('error')) {
          notificationType = "error";
          notificationMessage = `Error message on ${messageData.topic}`;
        } else if (messageData.payload.toLowerCase().includes('warning')) {
          notificationType = "warning";
          notificationMessage = `Warning message on ${messageData.topic}`;
        }
      }

      const newNotification = {
        id: Date.now(),
        message: notificationMessage,
        type: notificationType,
        timestamp: new Date(),
        read: false,
        topic: messageData.topic,
        payload: messageData.payload
      };
      
      setNotifications(prev => [newNotification, ...prev.slice(0, 19)]); // Keep last 20
      
      // Show toast for critical notifications
      if (notificationType === 'error' || notificationType === 'warning') {
        toast({
          title: notificationType === 'error' ? "Error Detected" : "Warning",
          description: notificationMessage,
          variant: notificationType === 'error' ? "destructive" : "default",
        });
      }
    }
    
    // Handle connection status changes
    if (message.type === 'connection_status') {
      const statusData = message.data;
      const notificationType = statusData.connected ? "success" : "error";
      const notificationMessage = `MQTT connection ${statusData.connected ? 'established' : 'lost'}: ${statusData.connectionName || 'Unknown'}`;
      
      const newNotification = {
        id: Date.now(),
        message: notificationMessage,
        type: notificationType,
        timestamp: new Date(),
        read: false,
        connectionId: statusData.connectionId
      };
      
      setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
      
      toast({
        title: statusData.connected ? "Connected" : "Disconnected",
        description: notificationMessage,
        variant: statusData.connected ? "default" : "destructive",
      });
    }
  });

  // Fetch connection status for notifications
  const { data: connections = [] } = useQuery({
    queryKey: ['/api/connections'],
  }) as { data: any[] };

  // Auto-refresh connection status for notifications
  useEffect(() => {
    const interval = setInterval(() => {
      if (connections.length > 0) {
        connections.forEach(connection => {
          // Check connection health and create notifications for status changes
          const wasConnected = localStorage.getItem(`connection_${connection.id}_status`) === 'connected';
          const isCurrentlyConnected = connection.isConnected;
          
          if (wasConnected !== isCurrentlyConnected) {
            const newNotification = {
              id: Date.now() + connection.id,
              message: `Connection ${connection.name} ${isCurrentlyConnected ? 'restored' : 'lost'}`,
              type: isCurrentlyConnected ? "success" : "error" as const,
              timestamp: new Date(),
              read: false,
              connectionId: connection.id
            };
            
            setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
            localStorage.setItem(`connection_${connection.id}_status`, isCurrentlyConnected ? 'connected' : 'disconnected');
          }
        });
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [connections]);

  // Click outside to close notifications
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  // Monitor connection status for notifications
  useEffect(() => {
    connections.forEach(connection => {
      const existingNotification = notifications.find(n => 
        n.message.includes(connection.name) && n.message.includes('connected')
      );
      
      if (connection.isConnected && !existingNotification) {
        const newNotification = {
          id: Date.now() + Math.random(),
          message: `${connection.name} connected successfully`,
          type: "success" as const,
          timestamp: new Date(),
          read: false
        };
        setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
      }
    });
  }, [connections]);

  // Remove old theme toggle function since we're using ThemeProvider now

  // Computed values
  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = notifications.filter(notification => {
    if (notificationFilter === 'all') return true;
    if (notificationFilter === 'unread') return !notification.read;
    return notification.type === notificationFilter;
  });

  // Priority-based notification ordering
  const priorityOrder: Record<string, number> = { error: 4, warning: 3, success: 2, info: 1 };
  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    // First sort by read status (unread first)
    if (a.read !== b.read) return a.read ? 1 : -1;
    // Then by priority
    const priorityDiff = (priorityOrder[b.type] || 0) - (priorityOrder[a.type] || 0);
    if (priorityDiff !== 0) return priorityDiff;
    // Finally by timestamp (newest first)
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
  };

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-400" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-400" />;
      default: return <Info className="h-4 w-4 text-blue-400" />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return timestamp.toLocaleDateString();
  };

  // Remove duplicate declaration - already defined above

  const navigation = [
    { name: 'Dashboard', href: '/', icon: BarChart3 },
    { name: 'Connections', href: '/connections', icon: Plug },
    { name: 'Topics', href: '/topics', icon: List },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    { name: 'Analytics', href: '/analytics', icon: TrendingUp },
    { name: 'Maps', href: '/maps', icon: MapPin },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const quickActions = [
    { name: 'Publish Message', icon: MessageSquare, action: () => setLocation('/messages') },
    { name: 'Subscribe Topic', icon: List, action: () => setLocation('/topics') },
  ];

  return (
    <div className="min-h-screen transition-colors duration-300">
      {/* Header */}
      <header className="glass-morphism fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden glass-morphism-dark"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>

            <div className="text-2xl font-bold text-gradient flex items-center">
              <Network className="mr-2 h-8 w-8 text-blue-400" />
              MQTT Dashboard
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <Button 
                variant="ghost" 
                size="sm" 
                className="relative glass-morphism-dark"
                onClick={handleNotificationClick}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>

              {/* Enhanced Notification Dropdown */}
              {showNotifications && (
                <Card className="absolute right-0 top-full mt-2 w-96 max-h-[32rem] overflow-hidden card-glass border-0 shadow-2xl z-50">
                  <CardContent className="p-0">
                    {/* Header with Filters */}
                    <div className="p-4 border-b border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold">Notifications</h3>
                        <div className="flex items-center space-x-2">
                          {unreadCount > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={markAllAsRead}
                              className="text-xs text-blue-400 hover:text-blue-300"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Mark all read
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllNotifications}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Clear all
                          </Button>
                        </div>
                      </div>
                      
                      {/* Filter Tabs */}
                      <div className="flex space-x-1 bg-gray-800 bg-opacity-50 rounded-md p-1">
                        {['all', 'unread', 'error', 'warning', 'success', 'info'].map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setNotificationFilter(filter as any)}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              notificationFilter === filter
                                ? 'bg-blue-500 text-white'
                                : 'hover:bg-gray-700 text-gray-400'
                            }`}
                          >
                            {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                            {filter === 'unread' && unreadCount > 0 && (
                              <span className="ml-1 text-xs bg-red-500 rounded-full px-1">
                                {unreadCount}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Enhanced Notification List */}
                    <div className="max-h-80 overflow-y-auto">
                      {sortedNotifications.length === 0 ? (
                        <div className="p-6 text-center">
                          <Bell className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">
                            {notificationFilter === 'all' ? 'No notifications' : `No ${notificationFilter} notifications`}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {notificationFilter === 'all' ? 'All caught up!' : 'Try a different filter'}
                          </p>
                        </div>
                      ) : (
                        sortedNotifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-3 border-b border-gray-700 hover:bg-gray-800 hover:bg-opacity-50 transition-colors cursor-pointer ${
                              !notification.read ? 'bg-blue-500 bg-opacity-5' : ''
                            }`}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-2 flex-1">
                                {getNotificationIcon(notification.type)}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm ${!notification.read ? 'text-white font-medium' : 'text-gray-300'}`}>
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {formatTimestamp(notification.timestamp)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1 ml-2">
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notification.id);
                                  }}
                                  className="p-1 h-6 w-6 text-gray-500 hover:text-red-400"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Enhanced Footer with Stats */}
                    {notifications.length > 0 && (
                      <div className="p-3 border-t border-gray-700 bg-gray-800 bg-opacity-50">
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <div className="flex items-center space-x-3">
                            <span>{sortedNotifications.length} of {notifications.length} shown</span>
                            {wsConnected && (
                              <span className="flex items-center text-green-400">
                                <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>
                                Live
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="text-xs">
                              {unreadCount} unread
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {notifications.filter(n => n.type === 'error').length} errors
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* User Profile */}
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full glass-morphism-dark cursor-pointer hover:bg-white hover:bg-opacity-10 transition-all duration-200">
              <User className="h-4 w-4" />
              <span className="text-sm">Admin</span>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`fixed left-0 top-20 bottom-0 w-64 sidebar z-40 p-6 transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <nav className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Button
                key={item.name}
                variant="ghost"
                className={`w-full justify-start nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setLocation(item.href)}
              >
                <Icon className="mr-3 h-4 w-4" />
                {item.name}
              </Button>
            );
          })}
        </nav>

        <Separator className="my-6" />

        {/* Quick Actions */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3">QUICK ACTIONS</h3>
          <div className="space-y-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.name}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start glass-morphism-dark"
                  onClick={action.action}
                >
                  <Icon className="mr-2 h-4 w-4 text-blue-400" />
                  {action.name}
                </Button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`pt-20 p-6 transition-all duration-300 ${
        sidebarOpen ? 'ml-64' : 'ml-0'
      }`}>
        {children}
      </main>

      {/* Floating Action Button */}
      <Button 
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full floating-action-button border-0 z-50"
        size="lg"
        onClick={() => setLocation('/messages')}
      >
        <Zap className="h-6 w-6" />
      </Button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}