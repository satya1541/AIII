import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function useMqtt() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Connect to MQTT broker
  const connectMutation = useMutation({
    mutationFn: async (connectionId: number) => {
      try {
        const response = await fetch(`/api/connections/${connectionId}/connect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          let errorMessage = 'Failed to connect to MQTT broker';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.details || errorMessage;
          } catch {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        
        return response.json();
      } catch (error: any) {
        console.error("Connect error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Connected",
        description: "Successfully connected to MQTT broker",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to MQTT broker",
        variant: "destructive",
      });
    },
  });

  // Disconnect from MQTT broker
  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: number) => {
      try {
        const response = await fetch(`/api/connections/${connectionId}/disconnect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          let errorMessage = 'Failed to disconnect from MQTT broker';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.details || errorMessage;
          } catch {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        
        return response.json();
      } catch (error: any) {
        console.error("Disconnect error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "Disconnected from MQTT broker",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
    },
    onError: (error: any) => {
      toast({
        title: "Disconnection Failed",
        description: error.message || "Failed to disconnect from MQTT broker",
        variant: "destructive",
      });
    },
  });

  // Subscribe to topic
  const subscribeMutation = useMutation({
    mutationFn: async ({ connectionId, topic, qos }: { connectionId: number; topic: string; qos: number }) => {
      try {
        const response = await fetch(`/api/connections/${connectionId}/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ topic, qos }),
        });

        if (!response.ok) {
          let errorMessage = 'Failed to subscribe to topic';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.details || errorMessage;
          } catch {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        
        return response.json();
      } catch (error: any) {
        console.error("Subscribe error:", error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Subscribed",
        description: "Successfully subscribed to topic",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
      queryClient.invalidateQueries({ queryKey: [`/api/connections/${variables.connectionId}/topics`] });
    },
    onError: (error: any) => {
      console.error("Subscribe mutation error:", error);
      const errorMessage = error?.message || error?.details || "Failed to subscribe to topic";
      toast({
        title: "Subscription Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Unsubscribe from topic
  const unsubscribeMutation = useMutation({
    mutationFn: async ({ connectionId, topic }: { connectionId: number; topic: string }) => {
      try {
        const response = await fetch(`/api/connections/${connectionId}/unsubscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ topic }),
        });

        if (!response.ok) {
          let errorMessage = 'Failed to unsubscribe from topic';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.details || errorMessage;
          } catch {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        
        return response.json();
      } catch (error: any) {
        console.error("Unsubscribe error:", error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Unsubscribed",
        description: "Successfully unsubscribed from topic",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
      queryClient.invalidateQueries({ queryKey: [`/api/connections/${variables.connectionId}/topics`] });
    },
    onError: (error: any) => {
      toast({
        title: "Unsubscribe Failed",
        description: error.message || "Failed to unsubscribe from topic",
        variant: "destructive",
      });
    },
  });

  // Publish message
  const publishMutation = useMutation({
    mutationFn: async ({ connectionId, topic, payload, qos, retain }: {
      connectionId: number;
      topic: string;
      payload: string;
      qos: number;
      retain: boolean;
    }) => {
      try {
        const response = await fetch(`/api/connections/${connectionId}/publish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ topic, payload, qos, retain }),
        });

        if (!response.ok) {
          let errorMessage = 'Failed to publish message';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.details || errorMessage;
          } catch {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        
        return response.json();
      } catch (error: any) {
        console.error("Publish error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Published",
        description: "Message published successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
    },
    onError: (error: any) => {
      toast({
        title: "Publish Failed",
        description: error.message || "Failed to publish message",
        variant: "destructive",
      });
    },
  });

  return {
    connect: connectMutation.mutate,
    disconnect: disconnectMutation.mutate,
    subscribe: subscribeMutation.mutate,
    unsubscribe: unsubscribeMutation.mutate,
    publish: publishMutation.mutate,
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    isSubscribing: subscribeMutation.isPending,
    isUnsubscribing: unsubscribeMutation.isPending,
    isPublishing: publishMutation.isPending,
  };
}