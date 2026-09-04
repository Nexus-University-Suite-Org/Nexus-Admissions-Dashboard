import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react';

const NAP_API = 'http://localhost:8080';

export interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  relatedId: number;
  link: string;
  read: boolean;
  createdAt: string;
}

export function useNotifications() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['admin', 'notifications'],
    queryFn: () => customFetch<Notification[]>(`${NAP_API}/api/v1/notifications`),
    refetchInterval: false,
  });

  useEffect(() => {
    const es = new EventSource(`${NAP_API}/api/v1/notifications/stream`);
    eventSourceRef.current = es;

    es.onopen = () => setIsConnected(true);

    es.addEventListener('notification', (event) => {
      const notification: Notification = JSON.parse(event.data);
      queryClient.setQueryData<Notification[]>(
        ['admin', 'notifications'],
        (old) => {
          if (!old) return [notification];
          if (old.some((n) => n.id === notification.id)) return old;
          return [notification, ...old];
        }
      );
    });

    es.onerror = () => {
      setIsConnected(false);
      es.close();
    };

    return () => {
      es.close();
      setIsConnected(false);
    };
  }, [queryClient]);

  const markAsRead = useMutation({
    mutationFn: (id: number) =>
      customFetch(`${NAP_API}/api/v1/notifications/${id}`, { method: 'PUT' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: () =>
      customFetch(`${NAP_API}/api/v1/notifications/mark-all-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 1 }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead: useCallback(
      (id: number) => markAsRead.mutate(id),
      [markAsRead]
    ),
    markAllAsRead: useCallback(
      () => markAllAsRead.mutate(),
      [markAllAsRead]
    ),
  };
}
