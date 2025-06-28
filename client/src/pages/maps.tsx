import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/layout';
import AzureMap from '@/components/azure-map';
import DeviceLocationManager from '@/components/device-location-manager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin, Satellite, Globe } from 'lucide-react';

export default function MapsPage() {
  const [selectedConnection, setSelectedConnection] = useState<number | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>('');

  // Fetch connections
  const { data: connections = [] } = useQuery({
    queryKey: ['/api/connections'],
  }) as { data: any[] };

  // Fetch topics for selected connection
  const { data: topics = [] } = useQuery({
    queryKey: ['/api/connections', selectedConnection, 'topics'],
    enabled: !!selectedConnection,
  }) as { data: any[] };

  const handleConnectionChange = (connectionId: string) => {
    const id = parseInt(connectionId);
    setSelectedConnection(id);
    setSelectedTopic('__all_topics__'); // Reset topic when connection changes
  };

  const handleTopicChange = (topic: string) => {
    setSelectedTopic(topic === '__all_topics__' ? '' : topic);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Globe className="h-8 w-8" />
              Geographic Maps
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor IoT devices and MQTT messages on interactive maps
            </p>
          </div>
        </div>

        {/* Connection and Topic Selection */}
        <Card className="glassmorphic">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Map Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">MQTT Connection</label>
                <Select value={selectedConnection?.toString() || ''} onValueChange={handleConnectionChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a connection" />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.filter((connection: any) => connection.id && connection.id.toString().trim() !== '').map((connection: any) => (
                      <SelectItem key={connection.id} value={connection.id.toString()}>
                        {connection.name}
                        <Badge variant="outline" className="ml-2">
                          {connection.protocol}://{connection.brokerUrl}:{connection.port}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Topic Filter (Optional)</label>
                <Select 
                  value={selectedTopic || '__all_topics__'} 
                  onValueChange={handleTopicChange}
                  disabled={!selectedConnection}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All topics" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all_topics__">All topics</SelectItem>
                    {topics.filter((topic: any) => topic.id && topic.topic && topic.topic.trim() !== '').map((topic: any) => (
                      <SelectItem key={topic.id} value={topic.topic}>
                        {topic.topic}
                        <Badge variant="secondary" className="ml-2">
                          {topic.messageCount} msgs
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Geographic Map */}
        <AzureMap 
          connectionId={selectedConnection} 
          selectedTopic={selectedTopic || undefined}
          height="600px"
        />

        {/* Device Location Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DeviceLocationManager connectionId={selectedConnection} />
          
          <Card className="glassmorphic">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Satellite className="h-5 w-5" />
                Map Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Fixed Device Locations</h4>
                    <p className="text-sm text-muted-foreground">
                      Manually configured device positions that appear as permanent markers
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Mobile Device Tracking</h4>
                    <p className="text-sm text-muted-foreground">
                      Real-time positions from MQTT messages containing latitude/longitude data
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Interactive Info Windows</h4>
                    <p className="text-sm text-muted-foreground">
                      Click any marker to view device details and recent sensor data
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Multiple Map Views</h4>
                    <p className="text-sm text-muted-foreground">
                      Switch between road, satellite, and hybrid map views
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="font-medium mb-2">How to Add Location Data</h4>
                <ul className="text-sm space-y-1 text-blue-800 dark:text-blue-200">
                  <li>• Add fixed devices using the Device Location Manager</li>
                  <li>• Send MQTT messages with "latitude" and "longitude" fields</li>
                  <li>• Include "deviceId" in messages for device identification</li>
                  <li>• Use JSON format: {`{"latitude": "40.7128", "longitude": "-74.0060", "temperature": 23.5}`}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}