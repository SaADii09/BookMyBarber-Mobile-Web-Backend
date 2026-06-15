import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { HapticPressable } from '@/components/ui';
import { btn, card, input, screen } from '@/constants/ui-classes';
import { api } from '@/lib/api';
import { useAuthSession } from '@/contexts/auth-session';

export default function ChatScreen() {
  const { status } = useAuthSession();
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [barberId, setBarberId] = useState('');

  useEffect(() => {
    if (status !== 'authenticated') return;
    (async () => {
      try {
        const { data } = await api.get('/app/chat/rooms');
        setRooms(data.rooms || []);
      } catch {
        /* session or network error */
      }
    })();
  }, [status]);

  const openRoom = async (id: string) => {
    setRoomId(id);
    const { data } = await api.get(`/app/chat/rooms/${id}/messages`);
    setMessages(data.messages || []);
  };

  const createRoom = async () => {
    if (!barberId.trim()) return;
    const { data } = await api.post('/app/chat/rooms', { barberId: barberId.trim() });
    setRooms((r) => [data.room, ...r]);
    openRoom(data.room.id);
  };

  const send = async () => {
    if (!roomId || !text.trim()) return;
    await api.post(`/app/chat/rooms/${roomId}/messages`, { message: text });
    setText('');
    openRoom(roomId);
  };

  const askAi = async () => {
    if (!roomId || !text.trim()) return;
    const { data } = await api.post(`/app/chat/rooms/${roomId}/ai`, { message: text });
    setText('');
    setMessages((m) => [...m, data.message]);
  };

  return (
    <SafeAreaView className={screen.root}>
      {!roomId ? (
        <View className="flex-1 gap-3 p-5">
          <ThemedText type="subtitle">Chat</ThemedText>
          <TextInput
            className={input.base}
            placeholder="Barber user ID to start chat"
            placeholderTextColor="#676F7E"
            value={barberId}
            onChangeText={setBarberId}
          />
          <HapticPressable haptic="medium" className={btn.primary} onPress={createRoom}>
            <ThemedText className={btn.primaryText}>New room</ThemedText>
          </HapticPressable>
          {rooms.map((r) => (
            <HapticPressable key={r.id} className={card.row} onPress={() => openRoom(r.id)}>
              <ThemedText>Room {r.id.slice(0, 8)}…</ThemedText>
            </HapticPressable>
          ))}
        </View>
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <HapticPressable className="p-4" onPress={() => setRoomId(null)}>
            <ThemedText type="linkPrimary">← Back</ThemedText>
          </HapticPressable>
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerClassName="gap-2 p-4"
            renderItem={({ item }) => (
              <View
                className={`max-w-[85%] rounded-xl p-2.5 ${
                  item.is_ai
                    ? 'self-end bg-accent'
                    : 'self-start bg-secondary'
                }`}>
                <ThemedText>{item.message}</ThemedText>
              </View>
            )}
          />
          <View className="flex-row gap-2 border-t border-border p-3">
            <TextInput
              className={`${input.base} flex-1`}
              value={text}
              onChangeText={setText}
              placeholder="Message…"
              placeholderTextColor="#676F7E"
            />
            <HapticPressable className={btn.primary} onPress={send}>
              <ThemedText className={btn.primaryText}>Send</ThemedText>
            </HapticPressable>
            <HapticPressable className={btn.secondary} onPress={askAi}>
              <ThemedText className={btn.secondaryText}>AI</ThemedText>
            </HapticPressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
