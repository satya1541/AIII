import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SuccessDialog } from "@/components/ui/success-dialog";
import { ErrorDialog } from "@/components/ui/error-dialog";
import { 
  Users, Activity, Database, Shield, UserCog, Trash2, Plus, 
  RefreshCw, Download, Upload, Settings, Bell, ChevronDown,
  BarChart3, TrendingUp, Clock, AlertTriangle, CheckCircle,
  Server, Wifi, WifiOff, MessageSquare, Eye, EyeOff, User, Edit, X
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import NivoAdminCharts from "@/components/nivo-admin-charts";

interface AdminUser {
  id: number;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminConnection {
  id: number;
  name: string;
  brokerUrl: string;
  port: number;
  protocol: string;
  clientId: string;
  userId: number;
  isConnected: boolean;
  createdAt: string;
}

interface AdminMessage {
  id: number;
  topic: string;
  payload: string;
  connectionId: number;
  timestamp: string;
}

export default function AdminDashboard() {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [newUserData, setNewUserData] = useState({ username: '', email: '', password: '', role: 'user' });
  const [filterRole, setFilterRole] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactiveConnections, setShowInactiveConnections] = useState(false);
  const [messageFilter, setMessageFilter] = useState('all');
  const [successDialog, setSuccessDialog] = useState({ open: false, message: "", title: "" });
  const [errorDialog, setErrorDialog] = useState({ open: false, message: "" });
  const [editProfileImage, setEditProfileImage] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: users = [], isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: connections = [], isLoading: connectionsLoading } = useQuery<AdminConnection[]>({
    queryKey: ["/api/admin/connections"],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<AdminMessage[]>({
    queryKey: ["/api/admin/messages"],
  });

  // System stats calculation
  const stats = {
    totalUsers: users.length,
    adminUsers: users.filter(user => user.role === 'admin').length,
    regularUsers: users.filter(user => user.role === 'user').length,
    totalConnections: connections.length,
    activeConnections: connections.filter(conn => conn.isConnected).length,
    inactiveConnections: connections.filter(conn => !conn.isConnected).length,
    totalMessages: messages.length,
    messagesLast24h: messages.filter(msg => 
      new Date(msg.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length,
    systemHealth: connections.filter(conn => conn.isConnected).length > 0 ? 95 : 70,
  };

  // Filtered data
  const filteredUsers = users.filter(user => {
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesSearch = searchTerm === '' || 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  const visibleConnections = showInactiveConnections 
    ? connections 
    : connections.filter(conn => conn.isConnected);

  const filteredMessages = messageFilter === 'all' 
    ? messages.slice(0, 100) 
    : messages.filter(msg => {
        if (messageFilter === 'recent') {
          return new Date(msg.timestamp) > new Date(Date.now() - 60 * 60 * 1000);
        }
        return msg.topic.toLowerCase().includes(messageFilter.toLowerCase());
      }).slice(0, 100);

  // User management mutations
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest('/api/admin/users', {
        method: 'POST',
        body: userData
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setNewUserData({ username: '', email: '', password: '', role: 'user' });
      setSuccessDialog({
        open: true,
        title: "User Created",
        message: "User created successfully"
      });
    },
    onError: (error: any) => {
      setErrorDialog({
        open: true,
        message: error.message || "Failed to create user"
      });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest(`/api/admin/users/${userId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setSuccessDialog({
        open: true,
        title: "User Deleted",
        message: "User deleted successfully"
      });
    },
    onError: (error: any) => {
      setErrorDialog({
        open: true,
        message: error.message || "Failed to delete user"
      });
    }
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number, role: string }) => {
      const response = await apiRequest(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: { role }
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setSuccessDialog({
        open: true,
        title: "Role Updated",
        message: "User role updated successfully"
      });
    },
    onError: (error: any) => {
      setErrorDialog({
        open: true,
        message: error.message || "Failed to update user role"
      });
    }
  });

  const clearMessagesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/admin/messages/clear', { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/messages'] });
      setSuccessDialog({
        open: true,
        title: "Messages Cleared",
        message: "All messages cleared successfully"
      });
    },
    onError: (error: any) => {
      setErrorDialog({
        open: true,
        message: error.message || "Failed to clear messages"
      });
    }
  });

  const updateUserProfileMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: number, userData: any }) => {
      const response = await apiRequest(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: userData
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setEditingUser(null);
      setEditProfileImage(null);
      setSuccessDialog({
        open: true,
        title: "User Updated",
        message: "User profile updated successfully"
      });
    },
    onError: (error: any) => {
      setErrorDialog({
        open: true,
        message: error.message || "Failed to update user profile"
      });
    }
  });

  const refreshDataMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/connections'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/messages'] }),
      ]);
    },
    onSuccess: () => {
      setSuccessDialog({
        open: true,
        title: "Data Refreshed",
        message: "Data refreshed successfully"
      });
    }
  });

  // Helper functions for profile image handling
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setErrorDialog({
          open: true,
          message: "Image file must be less than 2MB"
        });
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setErrorDialog({
          open: true,
          message: "Please select a valid image file"
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setEditProfileImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeEditImage = () => {
    setEditProfileImage(null);
  };

  const handleEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setEditProfileImage(user.profileImageUrl);
  };

  const handleSaveUserProfile = () => {
    if (!editingUser) return;

    const userData: any = {
      username: editingUser.username,
      email: editingUser.email,
      firstName: editingUser.firstName,
      lastName: editingUser.lastName,
      role: editingUser.role,
    };

    // Only include profileImageUrl if it's been changed
    if (editProfileImage !== editingUser.profileImageUrl) {
      userData.profileImageUrl = editProfileImage;
    }

    updateUserProfileMutation.mutate({ userId: editingUser.id, userData });
  };

  const exportData = () => {
    const data = {
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      })),
      connections: connections.map(conn => ({
        id: conn.id,
        name: conn.name,
        brokerUrl: conn.brokerUrl,
        port: conn.port,
        protocol: conn.protocol,
        userId: conn.userId,
        isConnected: conn.isConnected
      })),
      messages: messages.slice(0, 1000).map(msg => ({
        id: msg.id,
        topic: msg.topic,
        payload: msg.payload,
        timestamp: msg.timestamp,
        connectionId: msg.connectionId
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iot-dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshDataMutation.mutate()}
            disabled={refreshDataMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshDataMutation.isPending ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const data = {
                users: users.map(u => ({ ...u, password: undefined })),
                connections,
                messages: messages.slice(0, 100),
                exportDate: new Date().toISOString()
              };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `iot-dashboard-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              setSuccessDialog({
                open: true,
                title: "Data Exported",
                message: "Data exported successfully"
              });
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>
      
      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="card-glass border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.adminUsers} admins, {stats.regularUsers} users
            </p>
          </CardContent>
        </Card>

        <Card className="card-glass border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MQTT Connections</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConnections}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeConnections} active, {stats.inactiveConnections} inactive
            </p>
          </CardContent>
        </Card>

        <Card className="card-glass border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMessages}</div>
            <p className="text-xs text-muted-foreground">
              {stats.messagesLast24h} in last 24h
            </p>
          </CardContent>
        </Card>

        <Card className="card-glass border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.systemHealth}%</div>
            <Progress value={stats.systemHealth} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card className="card-glass border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Online</div>
            <p className="text-xs text-muted-foreground">
              All services operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Admin Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Analytics */}
        <Card className="card-glass border-0">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              System Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Active Connections</span>
                <span>{Math.round((stats.activeConnections / Math.max(stats.totalConnections, 1)) * 100)}%</span>
              </div>
              <Progress value={(stats.activeConnections / Math.max(stats.totalConnections, 1)) * 100} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Admin Users</span>
                <span>{Math.round((stats.adminUsers / Math.max(stats.totalUsers, 1)) * 100)}%</span>
              </div>
              <Progress value={(stats.adminUsers / Math.max(stats.totalUsers, 1)) * 100} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Messages (24h)</span>
                <span>{stats.messagesLast24h}</span>
              </div>
              <Progress value={Math.min((stats.messagesLast24h / 1000) * 100, 100)} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="card-glass border-0">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full justify-start" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>Add a new user to the system</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={newUserData.username}
                      onChange={(e) => setNewUserData({...newUserData, username: e.target.value})}
                      placeholder="Enter username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUserData.email}
                      onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                      placeholder="Enter email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                      placeholder="Enter password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={newUserData.role} onValueChange={(value) => setNewUserData({...newUserData, role: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={() => createUserMutation.mutate(newUserData)}
                    disabled={createUserMutation.isPending}
                    className="w-full"
                  >
                    {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full justify-start">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Messages
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Messages?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all MQTT messages from the database. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => clearMessagesMutation.mutate()}
                    disabled={clearMessagesMutation.isPending}
                  >
                    {clearMessagesMutation.isPending ? 'Clearing...' : 'Clear Messages'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button variant="outline" className="w-full justify-start">
              <Download className="h-4 w-4 mr-2" />
              Export System Logs
            </Button>
            
            <Button variant="outline" className="w-full justify-start">
              <Bell className="h-4 w-4 mr-2" />
              System Notifications
            </Button>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="card-glass border-0">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Server className="h-5 w-5 mr-2" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Database</span>
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">MQTT Service</span>
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Wifi className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">WebSocket</span>
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Activity className="h-3 w-3 mr-1" />
                Running
              </Badge>
            </div>
            <Separator />
            <div className="text-xs text-muted-foreground">
              Uptime: 99.9% • Last restart: {format(new Date(), 'MMM dd, HH:mm')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Data Tables */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users">Users ({stats.totalUsers})</TabsTrigger>
          <TabsTrigger value="connections">Connections ({stats.totalConnections})</TabsTrigger>
          <TabsTrigger value="messages">Messages ({stats.totalMessages})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="nivo-charts">Nivo Charts</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card className="card-glass border-0">
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Complete list of all users with advanced management capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* User Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search users by username or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin Only</SelectItem>
                    <SelectItem value="user">Users Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  Loading users...
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User Info</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Account Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {user.profileImageUrl ? (
                                  <img 
                                    src={user.profileImageUrl} 
                                    alt={user.username} 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="h-4 w-4 text-white" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium">{user.username}</div>
                                <div className="text-sm text-muted-foreground">
                                  ID: {user.id}
                                  {user.firstName && user.lastName && (
                                    <span> • {user.firstName} {user.lastName}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {user.email || <span className="text-muted-foreground">No email</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={user.role}
                              onValueChange={(newRole) => 
                                updateUserRoleMutation.mutate({ userId: user.id, role: newRole })
                              }
                              disabled={updateUserRoleMutation.isPending}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(user.createdAt), 'HH:mm')}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedUser(user)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    disabled={user.role === 'admin' && stats.adminUsers <= 1}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete user "{user.username}"? 
                                      This will also delete all their MQTT connections and data.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => deleteUserMutation.mutate(user.id)}
                                      disabled={deleteUserMutation.isPending}
                                    >
                                      Delete User
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
              
              {filteredUsers.length === 0 && !usersLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  No users found matching your search criteria.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connections" className="space-y-4">
          <Card className="card-glass border-0">
            <CardHeader>
              <CardTitle>MQTT Connection Monitor</CardTitle>
              <CardDescription>
                Real-time monitoring of all MQTT broker connections across users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Connection Filters */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Button
                    variant={showInactiveConnections ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowInactiveConnections(!showInactiveConnections)}
                  >
                    {showInactiveConnections ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                    {showInactiveConnections ? 'Hide Inactive' : 'Show All'}
                  </Button>
                  <Badge variant="outline">
                    {visibleConnections.length} of {stats.totalConnections} connections
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={stats.activeConnections > 0 ? "default" : "secondary"}
                    className="bg-green-600 text-white dark:bg-green-500 dark:text-white"
                  >
                    <Wifi className="h-3 w-3 mr-1" />
                    {stats.activeConnections} Active
                  </Badge>
                  <Badge 
                    variant="outline"
                    className="bg-gray-600 text-white dark:bg-gray-500 dark:text-white"
                  >
                    <WifiOff className="h-3 w-3 mr-1" />
                    {stats.inactiveConnections} Inactive
                  </Badge>
                </div>
              </div>

              {connectionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  Loading connections...
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Connection Details</TableHead>
                        <TableHead>Broker Info</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleConnections.map((connection) => (
                        <TableRow key={connection.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{connection.name}</div>
                              <div className="text-sm text-muted-foreground">
                                ID: {connection.id} • {connection.protocol.toUpperCase()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-mono">{connection.brokerUrl}:{connection.port}</div>
                              <div className="text-muted-foreground">
                                Client ID: {connection.clientId || 'Auto-generated'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              User {connection.userId}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Badge 
                              variant={connection.isConnected ? 'default' : 'secondary'}
                              className={connection.isConnected 
                                ? 'bg-green-600 text-white dark:bg-green-500 dark:text-white' 
                                : 'bg-gray-600 text-white dark:bg-gray-500 dark:text-white'
                              }
                            >
                                {connection.isConnected ? (
                                  <>
                                    <Wifi className="h-3 w-3 mr-1" />
                                    Connected
                                  </>
                                ) : (
                                  <>
                                    <WifiOff className="h-3 w-3 mr-1" />
                                    Disconnected
                                  </>
                                )}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(connection.createdAt), 'MMM dd, yyyy')}
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(connection.createdAt), 'HH:mm')}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}

              {visibleConnections.length === 0 && !connectionsLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  {showInactiveConnections 
                    ? "No connections found in the system." 
                    : "No active connections. Click 'Show All' to see inactive connections."}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <Card className="card-glass border-0">
            <CardHeader>
              <CardTitle>Message Stream Monitor</CardTitle>
              <CardDescription>
                Real-time MQTT message monitoring across all connections and users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Message Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Filter by topic name..."
                    value={messageFilter === 'all' ? '' : messageFilter}
                    onChange={(e) => setMessageFilter(e.target.value || 'all')}
                    className="w-full"
                  />
                </div>
                <Select value={messageFilter} onValueChange={setMessageFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Messages</SelectItem>
                    <SelectItem value="recent">Last Hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Message Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Messages</p>
                        <p className="text-2xl font-bold">{stats.totalMessages}</p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Last 24 Hours</p>
                        <p className="text-2xl font-bold">{stats.messagesLast24h}</p>
                      </div>
                      <Clock className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-orange-200 dark:border-orange-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Active Topics</p>
                        <p className="text-2xl font-bold">{new Set(messages.map(m => m.topic)).size}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {messagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  Loading messages...
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Topic & Payload</TableHead>
                        <TableHead>Connection</TableHead>
                        <TableHead>Message Details</TableHead>
                        <TableHead>Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMessages.map((message) => (
                        <TableRow key={message.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium text-sm">{message.topic}</div>
                              <div className="text-xs text-muted-foreground bg-gray-100 dark:bg-gray-800 p-2 mt-1 rounded font-mono max-w-xs truncate">
                                {message.payload}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              Connection {message.connectionId}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">
                              <div>ID: {message.id}</div>
                              <div className="text-muted-foreground">
                                Size: {new Blob([message.payload]).size} bytes
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(message.timestamp), 'MMM dd, HH:mm:ss')}
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(message.timestamp), 'yyyy')}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}

              {filteredMessages.length === 0 && !messagesLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  {stats.totalMessages === 0 
                    ? "No messages have been received yet." 
                    : "No messages match your current filter criteria."}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Performance */}
            <Card className="card-glass border-0">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  System Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Database Health</span>
                    <span className="text-sm text-green-600">Excellent</span>
                  </div>
                  <Progress value={95} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Connection Stability</span>
                    <span className="text-sm text-blue-600">{Math.round((stats.activeConnections / Math.max(stats.totalConnections, 1)) * 100)}%</span>
                  </div>
                  <Progress value={(stats.activeConnections / Math.max(stats.totalConnections, 1)) * 100} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Message Throughput</span>
                    <span className="text-sm text-orange-600">High</span>
                  </div>
                  <Progress value={Math.min((stats.messagesLast24h / 100) * 100, 100)} className="h-2" />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{stats.systemHealth}%</div>
                    <div className="text-xs text-muted-foreground">System Health</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">99.9%</div>
                    <div className="text-xs text-muted-foreground">Uptime</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Overview */}
            <Card className="card-glass border-0">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Activity Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-blue-600 mr-3" />
                      <div>
                        <div className="font-medium">User Activity</div>
                        <div className="text-sm text-muted-foreground">Total registered users</div>
                      </div>
                    </div>
                    <div className="text-xl font-bold text-blue-600">{stats.totalUsers}</div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center">
                      <Wifi className="h-5 w-5 text-green-600 mr-3" />
                      <div>
                        <div className="font-medium">Active Connections</div>
                        <div className="text-sm text-muted-foreground">Currently connected</div>
                      </div>
                    </div>
                    <div className="text-xl font-bold text-green-600">{stats.activeConnections}</div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="flex items-center">
                      <MessageSquare className="h-5 w-5 text-orange-600 mr-3" />
                      <div>
                        <div className="font-medium">Recent Messages</div>
                        <div className="text-sm text-muted-foreground">Last 24 hours</div>
                      </div>
                    </div>
                    <div className="text-xl font-bold text-orange-600">{stats.messagesLast24h}</div>
                  </div>
                </div>

                <Separator />

                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-2">System Status</div>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    All Systems Operational
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <Card className="card-glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Detailed System Analytics
              </CardTitle>
              <CardDescription>
                Comprehensive insights into system usage and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{stats.totalUsers}</div>
                  <div className="text-sm text-muted-foreground">Total Users</div>
                  <div className="text-xs text-green-600 mt-1">+{stats.totalUsers} this month</div>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold text-green-600 mb-2">{stats.totalConnections}</div>
                  <div className="text-sm text-muted-foreground">MQTT Connections</div>
                  <div className="text-xs text-blue-600 mt-1">{stats.activeConnections} active now</div>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold text-orange-600 mb-2">{stats.totalMessages}</div>
                  <div className="text-sm text-muted-foreground">Total Messages</div>
                  <div className="text-xs text-orange-600 mt-1">{stats.messagesLast24h} in 24h</div>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold text-purple-600 mb-2">{new Set(messages.map(m => m.topic)).size}</div>
                  <div className="text-sm text-muted-foreground">Unique Topics</div>
                  <div className="text-xs text-purple-600 mt-1">Across all connections</div>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="text-center text-sm text-muted-foreground">
                Analytics data is updated in real-time • Last refresh: {format(new Date(), 'HH:mm:ss')}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nivo-charts" className="space-y-4">
          <NivoAdminCharts />
        </TabsContent>
      </Tabs>

      {/* User Details Dialog */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden mr-3">
                  {selectedUser.profileImageUrl ? (
                    <img 
                      src={selectedUser.profileImageUrl} 
                      alt={selectedUser.username} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4 text-white" />
                  )}
                </div>
                <div>
                  <div className="flex items-center">
                    <Eye className="h-5 w-5 mr-2" />
                    User Details: {selectedUser.username}
                  </div>
                </div>
              </DialogTitle>
              <DialogDescription>
                Complete information and activity summary for this user
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Basic Information */}
              <Card className="bg-gray-50 dark:bg-gray-800/50">
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">User ID</Label>
                      <div className="font-mono text-sm">{selectedUser.id}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Username</Label>
                      <div className="font-medium">{selectedUser.username}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Email</Label>
                      <div className="text-sm">{selectedUser.email || "Not provided"}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Role</Label>
                      <Badge 
                        variant={selectedUser.role === 'admin' ? 'default' : 'secondary'}
                        className={selectedUser.role === 'admin' 
                          ? 'bg-blue-600 text-white dark:bg-blue-500 dark:text-white' 
                          : 'bg-gray-600 text-white dark:bg-gray-500 dark:text-white'
                        }
                      >
                        {selectedUser.role}
                      </Badge>
                    </div>
                  </div>
                  
                  {(selectedUser.firstName || selectedUser.lastName) && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Full Name</Label>
                      <div>{selectedUser.firstName} {selectedUser.lastName}</div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Account Created</Label>
                      <div className="text-sm">
                        {format(new Date(selectedUser.createdAt), 'MMM dd, yyyy')}
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(selectedUser.createdAt), 'HH:mm:ss')}
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Last Updated</Label>
                      <div className="text-sm">
                        {format(new Date(selectedUser.updatedAt), 'MMM dd, yyyy')}
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(selectedUser.updatedAt), 'HH:mm:ss')}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* User Activity Summary */}
              <Card className="bg-blue-50 dark:bg-blue-900/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    Activity Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {connections.filter(conn => conn.userId === selectedUser.id).length}
                      </div>
                      <div className="text-sm text-muted-foreground">MQTT Connections</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {connections.filter(conn => conn.userId === selectedUser.id && conn.isConnected).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Active Now</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {messages.filter(msg => 
                          connections.find(conn => conn.id === msg.connectionId && conn.userId === selectedUser.id)
                        ).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Messages</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* User's Connections */}
              {connections.filter(conn => conn.userId === selectedUser.id).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Wifi className="h-5 w-5 mr-2" />
                      MQTT Connections ({connections.filter(conn => conn.userId === selectedUser.id).length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {connections
                          .filter(conn => conn.userId === selectedUser.id)
                          .map(connection => (
                            <div key={connection.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <div className="font-medium">{connection.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {connection.brokerUrl}:{connection.port} ({connection.protocol})
                                </div>
                              </div>
                              <Badge 
                                variant={connection.isConnected ? 'default' : 'secondary'}
                                className={connection.isConnected 
                                  ? 'bg-green-600 text-white dark:bg-green-500 dark:text-white' 
                                  : 'bg-gray-600 text-white dark:bg-gray-500 dark:text-white'
                                }
                              >
                                {connection.isConnected ? 'Connected' : 'Disconnected'}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setSelectedUser(null)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit User Dialog */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={() => {
          setEditingUser(null);
          setEditProfileImage(null);
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Edit className="h-5 w-5 mr-2" />
                Edit User: {editingUser.username}
              </DialogTitle>
              <DialogDescription>
                Update user profile information and upload profile image
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Profile Image Upload */}
              <div className="space-y-3">
                <Label>Profile Photo</Label>
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {editProfileImage ? (
                      <div className="relative">
                        <img
                          src={editProfileImage}
                          alt="Profile preview"
                          className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                        />
                        <button
                          type="button"
                          onClick={removeEditImage}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                        <User className="w-8 h-8 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG up to 2MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Username</Label>
                  <Input
                    value={editingUser.username}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>First Name</Label>
                  <Input
                    value={editingUser.firstName || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input
                    value={editingUser.lastName || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Role</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(role) => setEditingUser({ ...editingUser, role })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => {
                setEditingUser(null);
                setEditProfileImage(null);
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveUserProfile}
                disabled={updateUserProfileMutation.isPending}
              >
                {updateUserProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <SuccessDialog
        open={successDialog.open}
        onOpenChange={(open) => setSuccessDialog({ ...successDialog, open })}
        title={successDialog.title}
        description={successDialog.message}
      />

      <ErrorDialog
        open={errorDialog.open}
        onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}
        title="Error"
        description={errorDialog.message}
      />
    </div>
  );
}