import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getWsBaseUrl } from '@srf/ui';

export type RealtimeConnectionState = 'CONNECTED' | 'RECONNECTING' | 'OFFLINE';

export interface UseRealtimeScoresOptions {
  eventId?: string;
  roundId?: string;
  role?: 'ADMIN' | 'STAGE' | 'JUDGE';
  onScoreEvent?: (event: any) => void;
}

export function useRealtimeScores({
  eventId,
  roundId,
  role = 'STAGE',
  onScoreEvent,
}: UseRealtimeScoresOptions) {
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('RECONNECTING');
  const socketRef = useRef<Socket | null>(null);
  const processedEventIds = useRef<Set<string>>(new Set());

  const onScoreEventRef = useRef(onScoreEvent);
  onScoreEventRef.current = onScoreEvent;

  useEffect(() => {
    const wsUrl = getWsBaseUrl();
    const socket = io(`${wsUrl}/realtime`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionState('CONNECTED');
      if (role === 'STAGE' && eventId) {
        socket.emit('join:stage', { eventId });
      } else if (role === 'ADMIN' && eventId) {
        socket.emit('join:admin', { eventId });
      } else if (role === 'JUDGE' && roundId) {
        socket.emit('join:judge', { roundId });
      }
    });

    socket.on('disconnect', () => {
      setConnectionState('RECONNECTING');
    });

    socket.on('connect_error', () => {
      setConnectionState('RECONNECTING');
    });

    socket.on('score:stage_event', (event: any) => {
      if (event?.eventId && processedEventIds.current.has(event.eventId)) {
        return; // Deduplicate
      }
      if (event?.eventId) {
        processedEventIds.current.add(event.eventId);
        if (processedEventIds.current.size > 500) {
          const first = processedEventIds.current.values().next().value;
          if (first) processedEventIds.current.delete(first);
        }
      }
      onScoreEventRef.current?.(event);
    });

    socket.on('score:event', (event: any) => {
      if (event?.eventId && processedEventIds.current.has(event.eventId)) {
        return;
      }
      if (event?.eventId) {
        processedEventIds.current.add(event.eventId);
      }
      onScoreEventRef.current?.(event);
    });

    return () => {
      socket.disconnect();
    };
  }, [eventId, roundId, role]);

  return { connectionState };
}
