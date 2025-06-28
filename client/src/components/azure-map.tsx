import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Satellite, Layers } from 'lucide-react';
import * as atlas from 'azure-maps-control';

interface DeviceMarker {
  id: string;
  name: string;
  position: { lat: number; lng: number };
  data?: any;
  status: 'online' | 'offline' | 'warning';
  lastSeen?: string;
  deviceType?: string;
}

interface AzureMapProps {
  connectionId?: number | null;
  selectedTopic?: string;
  height?: string;
}

export default function AzureMap({ connectionId, selectedTopic, height = "500px" }: AzureMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<atlas.Map | null>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [mapType, setMapType] = useState<'road' | 'satellite' | 'satellite_road_labels' | 'grayscale_dark'>('road');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch device locations
  const { data: deviceLocations = [] } = useQuery({
    queryKey: ['/api/device-locations', connectionId],
    enabled: !!connectionId,
  });

  // Fetch messages with location data  
  const { data: messagesWithLocation = [] } = useQuery({
    queryKey: ['/api/messages-with-location', connectionId, selectedTopic],
    enabled: !!connectionId,
  });

  // Initialize Azure Maps
  useEffect(() => {
    const initializeMap = async () => {
      if (!mapRef.current) {
        console.log('MapRef not available yet');
        return;
      }

      const primaryKey = import.meta.env.VITE_AZURE_MAPS_PRIMARY_KEY;
      console.log('Initializing Azure Maps with API key:', primaryKey ? 'Present' : 'Missing');

      if (!primaryKey) {
        console.error('Azure Maps API key is missing');
        setHasError(true);
        setErrorMessage('Azure Maps API key is missing. Please configure the API key.');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Creating Azure Maps instance...');
        
        // Initialize the map
        const mapInstance = new atlas.Map(mapRef.current, {
          center: [-74.0060, 40.7128], // Default to NYC [lng, lat]
          zoom: 10,
          style: mapType,
          authOptions: {
            authType: atlas.AuthenticationType.subscriptionKey,
            subscriptionKey: primaryKey
          }
        });

        // Wait for map to be ready
        mapInstance.events.add('ready', () => {
          console.log('Azure Maps instance created successfully');
          setMap(mapInstance);
          setIsLoading(false);
          setHasError(false);
        });

        mapInstance.events.add('error', (error: any) => {
          console.error('Azure Maps error:', error);
          setHasError(true);
          setErrorMessage('Failed to load Azure Maps');
          setIsLoading(false);
        });

      } catch (error: any) {
        console.error('Error loading Azure Maps:', error);
        setHasError(true);
        setErrorMessage(error.message || 'Failed to load Azure Maps');
        setIsLoading(false);
      }
    };

    initializeMap();
  }, [mapType]);

  // Create device markers
  useEffect(() => {
    if (!map) return;

    // Clear existing data sources and layers
    if (markers.length > 0) {
      markers.forEach(item => {
        try {
          if (item.remove) {
            item.remove(); // For data sources
          } else if (map.layers && map.layers.remove) {
            map.layers.remove(item); // For layers
          }
        } catch (e) {
          console.log('Error removing map item:', e);
        }
      });
    }
    setMarkers([]);

    // Create data source for markers
    const dataSource = new atlas.source.DataSource();
    map.sources.add(dataSource);

    let hasMarkers = false;

    // Add device location markers
    (deviceLocations as any[])?.forEach((device: any) => {
      const lat = parseFloat(device.latitude);
      const lng = parseFloat(device.longitude);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        const point = new atlas.data.Feature(new atlas.data.Point([lng, lat]), {
          title: device.name || device.deviceId || 'Device',
          type: 'device',
          data: device
        });
        dataSource.add(point);
        hasMarkers = true;
      }
    });

    // Add markers from recent messages with location
    (messagesWithLocation as any[])?.forEach((message: any) => {
      const lat = parseFloat(message.latitude);
      const lng = parseFloat(message.longitude);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        const point = new atlas.data.Feature(new atlas.data.Point([lng, lat]), {
          title: `${message.topic} - ${message.deviceId || 'Unknown Device'}`,
          type: 'message',
          data: message,
          timestamp: message.timestamp
        });
        dataSource.add(point);
        hasMarkers = true;
      }
    });

    // Create symbol layer for device markers
    const deviceLayer = new atlas.layer.SymbolLayer(dataSource, 'device-layer', {
      filter: ['==', ['get', 'type'], 'device'],
      iconOptions: {
        image: 'pin-blue',
        anchor: 'center',
        allowOverlap: true,
        size: 1.2
      }
    });

    // Create symbol layer for message markers  
    const messageLayer = new atlas.layer.SymbolLayer(dataSource, 'message-layer', {
      filter: ['==', ['get', 'type'], 'message'],
      iconOptions: {
        image: 'pin-green', 
        anchor: 'center',
        allowOverlap: true,
        size: 1.0
      }
    });

    map.layers.add([deviceLayer, messageLayer]);

    // Create popup for marker clicks
    const popup = new atlas.Popup();

    // Add click events for device markers
    map.events.add('click', deviceLayer, (e: any) => {
      if (e.shapes && e.shapes.length > 0) {
        const properties = e.shapes[0].getProperties();
        const content = createInfoWindowContent(properties.data);
        popup.setOptions({
          content: content,
          position: e.shapes[0].getCoordinates()
        });
        popup.open(map);
      }
    });

    // Add click events for message markers
    map.events.add('click', messageLayer, (e: any) => {
      if (e.shapes && e.shapes.length > 0) {
        const properties = e.shapes[0].getProperties();
        const content = createMessageInfoWindowContent(properties.data);
        popup.setOptions({
          content: content,
          position: e.shapes[0].getCoordinates()
        });
        popup.open(map);
      }
    });

    setMarkers([dataSource, deviceLayer, messageLayer]);

    // Fit map bounds to show all markers
    if (hasMarkers) {
      try {
        const bbox = atlas.data.BoundingBox.fromData(dataSource.toJson());
        map.setCamera({
          bounds: bbox,
          padding: 50
        });
      } catch (e) {
        console.log('Error fitting bounds:', e);
      }
    }
  }, [map, deviceLocations, messagesWithLocation]);

  const createInfoWindowContent = (device: any) => {
    return `
      <div class="p-3 max-w-xs">
        <h3 class="font-bold text-lg mb-2">${device.name || device.deviceId || 'Device'}</h3>
        <div class="space-y-1 text-sm">
          <p><strong>Device ID:</strong> ${device.deviceId || 'N/A'}</p>
          <p><strong>Location:</strong> ${device.latitude}, ${device.longitude}</p>
          <p><strong>Type:</strong> ${device.deviceType || 'Unknown'}</p>
        </div>
      </div>
    `;
  };

  const createMessageInfoWindowContent = (message: any) => {
    const payload = message.payload ? JSON.parse(message.payload) : {};
    return `
      <div class="p-3 max-w-xs">
        <h3 class="font-bold text-lg mb-2">${message.topic}</h3>
        <div class="space-y-1 text-sm">
          <p><strong>Device:</strong> ${message.deviceId || 'Unknown'}</p>
          <p><strong>Location:</strong> ${message.latitude}, ${message.longitude}</p>
          <p><strong>Time:</strong> ${new Date(message.timestamp).toLocaleString()}</p>
          <p><strong>Data:</strong></p>
          <pre class="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">${JSON.stringify(payload, null, 2)}</pre>
        </div>
      </div>
    `;
  };

  const changeMapType = (type: 'road' | 'satellite' | 'satellite_road_labels' | 'grayscale_dark') => {
    setMapType(type);
    if (map) {
      map.setStyle({ style: type });
    }
  };

  if (isLoading) {
    return (
      <Card className="glassmorphic">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Geographic Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading map...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasError) {
    return (
      <Card className="glassmorphic">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Geographic Map - Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-red-500 mb-4">
              <MapPin className="h-12 w-12 mx-auto mb-2" />
              <p className="text-lg font-medium">Map Loading Failed</p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
              {errorMessage}
            </p>
            <button 
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                setErrorMessage('');
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalMarkers = ((deviceLocations as any[])?.length || 0) + ((messagesWithLocation as any[])?.length || 0);

  return (
    <Card className="glassmorphic">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Geographic Map
            <Badge variant="outline" className="ml-2">
              {totalMarkers} markers
            </Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={mapType === 'road' ? 'default' : 'outline'}
              size="sm"
              onClick={() => changeMapType('road')}
            >
              <Navigation className="h-4 w-4 mr-1" />
              Road
            </Button>
            <Button
              variant={mapType === 'satellite' ? 'default' : 'outline'}
              size="sm"
              onClick={() => changeMapType('satellite')}
            >
              <Satellite className="h-4 w-4 mr-1" />
              Satellite
            </Button>
            <Button
              variant={mapType === 'satellite_road_labels' ? 'default' : 'outline'}
              size="sm"
              onClick={() => changeMapType('satellite_road_labels')}
            >
              <Layers className="h-4 w-4 mr-1" />
              Hybrid
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div 
          ref={mapRef} 
          style={{ height, width: '100%' }}
          className="rounded-lg border shadow-inner"
        />
        {totalMarkers === 0 && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              No devices with location data found. Add device locations or send MQTT messages with latitude/longitude fields to see them on the map.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}