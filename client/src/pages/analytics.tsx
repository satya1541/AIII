import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, BarChart3, PieChart, Activity, Download, RefreshCw, Layers, Zap } from "lucide-react";
import AnalyticsChart from "@/components/analytics-chart";
import DynamicChart from "@/components/dynamic-chart";
import AdvancedCharts from "@/components/advanced-charts";
import KeyChart from "@/components/key-chart";

export default function Analytics() {
  const [selectedConnection, setSelectedConnection] = useState<number | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState("24h");

  const { data: connections = [] } = useQuery({
    queryKey: ['/api/connections'],
  }) as { data: any[] };

  const { data: topics = [] } = useQuery({
    queryKey: ['/api/topics', selectedConnection],
    enabled: !!selectedConnection,
  }) as { data: any[] };

  const { data: stats = {} } = useQuery({
    queryKey: ['/api/stats'],
    refetchInterval: 30000,
  }) as { data: any };

  const { data: topicKeys = [] } = useQuery({
    queryKey: [`/api/topics/${encodeURIComponent(selectedTopic)}/keys`],
    enabled: !!selectedTopic,
  }) as { data: any[] };

  // Load topic and connection from localStorage on component mount
  useEffect(() => {
    const storedTopic = localStorage.getItem('selectedTopic');
    const storedConnectionId = localStorage.getItem('selectedConnectionId');
    
    if (storedTopic) {
      setSelectedTopic(storedTopic);
      localStorage.removeItem('selectedTopic'); // Clean up after use
    }
    
    if (storedConnectionId) {
      setSelectedConnection(Number(storedConnectionId));
      localStorage.removeItem('selectedConnectionId'); // Clean up after use
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-gray-400 mt-1">Analyze your MQTT data with real-time insights</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 glass-morphism-dark border-0">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="glass-morphism-dark border-0">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="glass-morphism-dark border-0">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-glass border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500 bg-opacity-20 rounded-lg">
                <Activity className="h-6 w-6 text-blue-400" />
              </div>
              <span className="text-2xl font-bold text-white">{(stats as any)?.activeConnections || 0}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-300">Active Connections</h3>
            <p className="text-xs text-blue-400 mt-1">Real-time monitoring</p>
          </CardContent>
        </Card>

        <Card className="card-glass border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500 bg-opacity-20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
              <span className="text-2xl font-bold text-white">{(stats as any)?.messagesTotal || 0}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-300">Total Messages</h3>
            <p className="text-xs text-green-400 mt-1">+12% from yesterday</p>
          </CardContent>
        </Card>

        <Card className="card-glass border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500 bg-opacity-20 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-400" />
              </div>
              <span className="text-2xl font-bold text-white">{(stats as any)?.activeTopics || 0}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-300">Active Topics</h3>
            <p className="text-xs text-purple-400 mt-1">Subscribed topics</p>
          </CardContent>
        </Card>

        <Card className="card-glass border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-500 bg-opacity-20 rounded-lg">
                <PieChart className="h-6 w-6 text-orange-400" />
              </div>
              <span className="text-2xl font-bold text-white">
                {topicKeys?.length || 0}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-300">Data Keys</h3>
            <p className="text-xs text-orange-400 mt-1">Extracted from JSON</p>
          </CardContent>
        </Card>
      </div>

      {/* Connection and Topic Selection */}
      <Card className="card-glass border-0">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Connection
              </label>
              <Select 
                value={selectedConnection?.toString()} 
                onValueChange={(value) => setSelectedConnection(Number(value))}
              >
                <SelectTrigger className="glass-morphism-dark border-0">
                  <SelectValue placeholder="Choose a connection" />
                </SelectTrigger>
                <SelectContent>
                  {connections.filter((conn: any) => conn.id && conn.name).map((conn: any) => (
                    <SelectItem key={conn.id} value={conn.id.toString()}>
                      {conn.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Topic for Detailed Analysis
              </label>
              <Select 
                value={selectedTopic} 
                onValueChange={(value) => {
                  setSelectedTopic(value);
                  setSelectedKeys([]);
                }}
                disabled={!selectedConnection}
              >
                <SelectTrigger className="glass-morphism-dark border-0">
                  <SelectValue placeholder="Choose a topic" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((topic: any) => (
                    <SelectItem key={topic.id} value={topic.topic}>
                      {topic.topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Key Selection */}
      {selectedTopic && topicKeys.length > 0 && (
        <Card className="card-glass border-0">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Layers className="h-5 w-5" />
              <span>Available Data Keys</span>
              <span className="text-xs text-gray-400 font-normal">
                Select keys to create charts ({selectedKeys.length} selected)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
              {topicKeys.map((key: any) => {
                const isSelected = selectedKeys.includes(key.keyName);
                return (
                  <Button
                    key={key.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedKeys(selectedKeys.filter(k => k !== key.keyName));
                      } else {
                        setSelectedKeys([...selectedKeys, key.keyName]);
                      }
                    }}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className={`${
                      isSelected 
                        ? "bg-blue-600 hover:bg-blue-700 text-white" 
                        : "glass-morphism-dark border-gray-600 text-gray-300 hover:bg-gray-700"
                    } transition-all duration-200 h-auto p-3`}
                  >
                    <div className="flex flex-col items-start text-left w-full">
                      <span className="font-mono text-xs font-medium">{key.keyName}</span>
                      <span className="text-xs opacity-70 capitalize">{key.keyType}</span>
                      <span className="text-xs opacity-50">
                        {key.valueCount} values
                      </span>
                    </div>
                  </Button>
                );
              })}
            </div>
            
            {selectedKeys.length > 0 && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-300">
                    {selectedKeys.length} key{selectedKeys.length !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setSelectedKeys([])}
                    variant="outline"
                    size="sm"
                    className="glass-morphism-dark border-gray-600 text-gray-300"
                  >
                    Clear All
                  </Button>
                  <Button
                    onClick={() => setSelectedKeys(topicKeys.map((k: any) => k.keyName))}
                    variant="outline"
                    size="sm"
                    className="glass-morphism-dark border-gray-600 text-gray-300"
                  >
                    Select All
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Multiple Charts for Selected Keys */}
      {selectedKeys.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Data Visualization</span>
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {selectedKeys.map((keyName) => {
              const keyData = topicKeys.find((k: any) => k.keyName === keyName);
              return (
                <Card key={keyName} className="card-glass border-0">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4" />
                        <span className="font-mono text-sm">{keyName}</span>
                      </div>
                      <span className="text-xs text-gray-400 capitalize">
                        {keyData?.keyType || 'unknown'}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <KeyChart 
                      topic={selectedTopic}
                      keyName={keyName}
                      keyType={keyData?.keyType}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-glass border-0">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Message Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsChart connectionId={selectedConnection} />
          </CardContent>
        </Card>

        <Card className="card-glass border-0">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Topic Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {topics.slice(0, 5).map((topic: any, index: number) => (
                <div key={topic.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full bg-${['blue', 'green', 'purple', 'orange', 'pink'][index]}-400`} />
                    <span className="text-sm text-gray-300 truncate">{topic.topic}</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{topic.messageCount || 0}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dynamic JSON Key Visualization */}
      {selectedTopic && (
        <Card className="card-glass border-0">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              Dynamic Data Visualization - {selectedTopic}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DynamicChart topic={selectedTopic} />
          </CardContent>
        </Card>
      )}

      {/* Advanced Charts Section */}
      <AdvancedCharts 
        connectionId={selectedConnection}
        selectedTopic={selectedTopic}
      />

      {/* JSON Keys Analysis */}
      {topicKeys && topicKeys.length > 0 && (
        <Card className="card-glass border-0">
          <CardHeader>
            <CardTitle className="text-white">Extracted JSON Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topicKeys.map((key: any) => (
                <div key={key.id} className="p-4 glass-morphism-dark rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm text-blue-400">{key.keyName}</span>
                    <span className="text-xs text-gray-400 capitalize">{key.keyType}</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    Last value: <span className="text-white">{key.lastValue}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Seen {key.valueCount} times
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}