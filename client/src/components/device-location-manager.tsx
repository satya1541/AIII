import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { insertDeviceLocationSchema } from '@shared/schema';

const deviceLocationSchema = insertDeviceLocationSchema.extend({
  latitude: z.string().regex(/^-?\d+\.?\d*$/, 'Invalid latitude format'),
  longitude: z.string().regex(/^-?\d+\.?\d*$/, 'Invalid longitude format'),
});

type DeviceLocationFormData = z.infer<typeof deviceLocationSchema>;

interface DeviceLocationManagerProps {
  connectionId?: number | null;
}

export default function DeviceLocationManager({ connectionId }: DeviceLocationManagerProps) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<DeviceLocationFormData>({
    resolver: zodResolver(deviceLocationSchema),
    defaultValues: {
      deviceId: '',
      name: '',
      latitude: '',
      longitude: '',
      description: '',
      deviceType: 'sensor',
      connectionId: connectionId || undefined,
    },
  });

  // Fetch device locations
  const { data: deviceLocations = [], isLoading } = useQuery({
    queryKey: ['/api/device-locations', connectionId],
    enabled: !!connectionId,
  });

  // Create device location mutation
  const createDeviceLocation = useMutation({
    mutationFn: async (data: DeviceLocationFormData) => {
      const response = await fetch('/api/device-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create device location');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/device-locations'] });
      toast({ title: 'Device location added successfully' });
      setIsAddingNew(false);
      form.reset();
    },
    onError: () => {
      toast({ 
        title: 'Error', 
        description: 'Failed to add device location',
        variant: 'destructive' 
      });
    },
  });

  // Update device location mutation
  const updateDeviceLocation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<DeviceLocationFormData> }) => {
      const response = await fetch(`/api/device-locations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update device location');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/device-locations'] });
      toast({ title: 'Device location updated successfully' });
      setEditingId(null);
    },
    onError: () => {
      toast({ 
        title: 'Error', 
        description: 'Failed to update device location',
        variant: 'destructive' 
      });
    },
  });

  // Delete device location mutation
  const deleteDeviceLocation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/device-locations/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete device location');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/device-locations'] });
      toast({ title: 'Device location deleted successfully' });
    },
    onError: () => {
      toast({ 
        title: 'Error', 
        description: 'Failed to delete device location',
        variant: 'destructive' 
      });
    },
  });

  const onSubmit = (data: DeviceLocationFormData) => {
    if (editingId) {
      updateDeviceLocation.mutate({ id: editingId, data });
    } else {
      createDeviceLocation.mutate(data);
    }
  };

  const startEditing = (device: any) => {
    setEditingId(device.id);
    form.reset({
      deviceId: device.deviceId,
      name: device.name,
      latitude: device.latitude,
      longitude: device.longitude,
      description: device.description || '',
      deviceType: device.deviceType || 'sensor',
      connectionId: device.connectionId,
    });
    setIsAddingNew(true);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setIsAddingNew(false);
    form.reset();
  };

  const deviceTypes = [
    { value: 'sensor', label: 'Sensor' },
    { value: 'camera', label: 'Camera' },
    { value: 'gateway', label: 'Gateway' },
    { value: 'actuator', label: 'Actuator' },
    { value: 'vehicle', label: 'Vehicle' },
    { value: 'weather_station', label: 'Weather Station' },
    { value: 'other', label: 'Other' },
  ];

  if (!connectionId) {
    return (
      <Card className="glassmorphic">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Please select a connection to manage device locations.
          </p>
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
            Device Locations
            <Badge variant="outline" className="ml-2">
              {deviceLocations.length} devices
            </Badge>
          </CardTitle>
          <Button
            onClick={() => setIsAddingNew(true)}
            disabled={isAddingNew}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Device
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAddingNew && (
          <Card className="border-dashed">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm">
                {editingId ? 'Edit Device Location' : 'Add New Device Location'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="deviceId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Device ID</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="device_001" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Temperature Sensor 1" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="40.7128" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="longitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitude</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="-74.0060" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="deviceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Device Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select device type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {deviceTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Additional information about this device..."
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={createDeviceLocation.isPending || updateDeviceLocation.isPending}
                      size="sm"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {editingId ? 'Update' : 'Add'} Device
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={cancelEditing}
                      size="sm"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading device locations...</p>
          </div>
        ) : deviceLocations.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No device locations configured.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add device locations to see them on the geographic map.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {deviceLocations.map((device: any) => (
              <Card key={device.id} className="border">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{device.name}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {device.deviceType}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        <strong>Device ID:</strong> {device.deviceId}
                      </p>
                      <p className="text-sm text-muted-foreground mb-1">
                        <strong>Location:</strong> {device.latitude}, {device.longitude}
                      </p>
                      {device.description && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Description:</strong> {device.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditing(device)}
                        disabled={isAddingNew}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteDeviceLocation.mutate(device.id)}
                        disabled={deleteDeviceLocation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}