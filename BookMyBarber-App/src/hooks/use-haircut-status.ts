import { useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';
import { supabaseRealtime } from '@/lib/supabase-realtime';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface HaircutRequest {
  id: string;
  user_id: string;
  front_image_url: string;
  left_image_url: string;
  right_image_url: string;
  status: 'pending' | 'analyzing' | 'queued' | 'processing' | 'completed' | 'failed';
  face_shape: string | null;
  hair_density: string | null;
  hair_texture: string | null;
  hair_color: string | null;
  haircut_title: string | null;
  stylist_recommendation: string | null;
  generation_prompt: string | null;
  result_image_url: string | null;
  error_message: string | null;
  error_stage: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Subscribe to real-time status updates for a haircut request.
 * Returns the current HaircutRequest data (pushes on every DB update).
 */
export function useHaircutStatus(requestId: string | null) {
  const [data, setData] = useState<HaircutRequest | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!requestId) {
      setData(null);
      return;
    }

    let channel: RealtimeChannel | null = null;

    function subscribe() {
      channel = supabaseRealtime
        .channel(`haircut-${requestId}`)
        .on(
          'postgres_changes' as any,
          {
            event: '*',
            schema: 'public',
            table: 'haircut_requests',
            filter: `id=eq.${requestId}`,
          } as any,
          (payload: any) => {
            if (payload.eventType === 'DELETE') {
              setData(null);
            } else {
              setData(payload.new as HaircutRequest);
            }
          },
        )
        .subscribe();
    }

    subscribe();

    // Re-subscribe on foreground (Expo WebSocket reconnect workaround)
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/background/) && nextState === 'active') {
        channel?.unsubscribe();
        channel = null;
        subscribe();
      }
      appState.current = nextState;
    });

    return () => {
      sub.remove();
      if (channel) {
        supabaseRealtime.removeChannel(channel);
      }
    };
  }, [requestId]);

  return data;
}
