import React, { useEffect, useRef, useState } from 'react';
import * as atlas from 'azure-maps-control';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Satellite, Navigation, Layers } from 'lucide-react';

interface DeviceMarker {
  id: string;
  name: string;
  position: { lat: number; lng: number };
  data?: any;
  status: 'online' | 'offline' | 'warning';
  lastSeen?: string;
  deviceType?: string;
}

interface GeographicMapProps {
  connectionId?: number | null;
  selectedTopic?: string;
  height?: string;
}

export default function GeographicMap({ connectionId, selectedTopic, height = "500px" }: GeographicMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch device locations
  const { data: deviceLocations = [] } = useQuery({
    queryKey: ['/api/device-locations', connectionId],
    enabled: !!connectionId,
  });

  // Fetch recent messages with location data
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
          style: mapType === 'satellite' ? 'satellite' : 
                 mapType === 'hybrid' ? 'satellite_road_labels' :
                 'road',
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

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);

    const newMarkers: google.maps.Marker[] = [];
    const bounds = new google.maps.LatLngBounds();

    // Add device location markers
    deviceLocations.forEach((device: any) => {
      const lat = parseFloat(device.latitude);
      const lng = parseFloat(device.longitude);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        const marker = new google.maps.Marker({
          position: { lat, lng },
          map,
          title: device.name,
          icon: {
            url: createDeviceIcon(device.deviceType || 'sensor', 'online'),
            scaledSize: new google.maps.Size(32, 32),
          }
        });

        const infoWindow = new google.maps.InfoWindow({
          content: createInfoWindowContent(device)
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        newMarkers.push(marker);
        bounds.extend({ lat, lng });
      }
    });

    // Add markers from recent messages with location
    messagesWithLocation.forEach((message: any) => {
      const lat = parseFloat(message.latitude);
      const lng = parseFloat(message.longitude);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        const marker = new google.maps.Marker({
          position: { lat, lng },
          map,
          title: `${message.topic} - ${message.deviceId || 'Unknown Device'}`,
          icon: {
            url: createDeviceIcon('mobile', getDeviceStatus(message)),
            scaledSize: new google.maps.Size(28, 28),
          }
        });

        const infoWindow = new google.maps.InfoWindow({
          content: createMessageInfoWindowContent(message)
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        newMarkers.push(marker);
        bounds.extend({ lat, lng });
      }
    });

    setMarkers(newMarkers);

    // Fit map to show all markers
    if (newMarkers.length > 0) {
      map.fitBounds(bounds);
      if (newMarkers.length === 1) {
        map.setZoom(15);
      }
    }
  }, [map, deviceLocations, messagesWithLocation]);

  const createDeviceIcon = (deviceType: string, status: string) => {
    const iconBase = 'https://maps.google.com/mapfiles/ms/icons/';
    const colors = {
      online: 'green',
      offline: 'red',
      warning: 'yellow'
    };
    
    return `${iconBase}${colors[status as keyof typeof colors] || 'blue'}-dot.png`;
  };

  const getDeviceStatus = (message: any) => {
    const now = new Date();
    const messageTime = new Date(message.timestamp);
    const minutesAgo = (now.getTime() - messageTime.getTime()) / (1000 * 60);
    
    if (minutesAgo < 5) return 'online';
    if (minutesAgo < 30) return 'warning';
    return 'offline';
  };

  const createInfoWindowContent = (device: any) => {
    return `
      <div class="p-3 min-w-[200px]">
        <h3 class="font-semibold text-lg mb-2">${device.name}</h3>
        <p class="text-sm text-gray-600 mb-1"><strong>Device ID:</strong> ${device.deviceId}</p>
        <p class="text-sm text-gray-600 mb-1"><strong>Type:</strong> ${device.deviceType || 'Unknown'}</p>
        <p class="text-sm text-gray-600 mb-1"><strong>Location:</strong> ${device.latitude}, ${device.longitude}</p>
        ${device.description ? `<p class="text-sm text-gray-600 mb-1"><strong>Description:</strong> ${device.description}</p>` : ''}
        <div class="mt-2">
          <span class="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Online</span>
        </div>
      </div>
    `;
  };

  const createMessageInfoWindowContent = (message: any) => {
    let payload;
    try {
      payload = JSON.parse(message.payload);
    } catch {
      payload = message.payload;
    }

    const status = getDeviceStatus(message);
    const statusColors = {
      online: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      offline: 'bg-red-100 text-red-800'
    };

    return `
      <div class="p-3 min-w-[200px]">
        <h3 class="font-semibold text-lg mb-2">${message.deviceId || 'Mobile Device'}</h3>
        <p class="text-sm text-gray-600 mb-1"><strong>Topic:</strong> ${message.topic}</p>
        <p class="text-sm text-gray-600 mb-1"><strong>Last Seen:</strong> ${new Date(message.timestamp).toLocaleString()}</p>
        <p class="text-sm text-gray-600 mb-1"><strong>Position:</strong> ${message.latitude}, ${message.longitude}</p>
        <div class="mt-2 mb-2">
          <span class="inline-block px-2 py-1 text-xs rounded ${statusColors[status]}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
        </div>
        <div class="text-sm">
          <strong>Data:</strong>
          <pre class="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">${typeof payload === 'object' ? JSON.stringify(payload, null, 2) : payload}</pre>
        </div>
      </div>
    `;
  };

  const changeMapType = (type: 'roadmap' | 'satellite' | 'hybrid' | 'terrain') => {
    setMapType(type);
    if (map) {
      map.setMapTypeId(type);
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

  return (
    <Card className="glassmorphic">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Geographic Map
            <Badge variant="outline" className="ml-2">
              {markers.length} devices
            </Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={mapType === 'roadmap' ? 'default' : 'outline'}
              size="sm"
              onClick={() => changeMapType('roadmap')}
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
              variant={mapType === 'hybrid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => changeMapType('hybrid')}
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
        {markers.length === 0 && (
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