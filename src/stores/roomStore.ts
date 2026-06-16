import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Room, Message, RoomADHDConfig } from '../types';
import { DEFAULT_ROOMS } from '../types';

export interface RoomMessages {
  [roomId: string]: Message[];
}

interface RoomState {
  rooms: Room[];
  activeRoomId: string;
  messages: RoomMessages;
  isStreaming: boolean;
  abortController: AbortController | null;

  // Room actions
  setActiveRoom: (roomId: string) => void;
  addRoom: (room: Room) => void;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  deleteRoom: (roomId: string) => void;
  updateRoomADHD: (roomId: string, config: Partial<RoomADHDConfig>) => void;

  // Message actions
  addMessage: (roomId: string, message: Message) => void;
  updateMessage: (roomId: string, messageId: string, content: string) => void;
  clearRoomMessages: (roomId: string) => void;
  clearAllMessages: () => void;

  // Streaming
  setStreaming: (streaming: boolean) => void;
  setAbortController: (controller: AbortController | null) => void;
  abortStream: () => void;

  // Helpers
  getActiveRoom: () => Room | undefined;
  getActiveMessages: () => Message[];
  getRoomMessages: (roomId: string) => Message[];
}

export const useRoomStore = create<RoomState>()(
  persist(
    (set, get) => ({
      rooms: DEFAULT_ROOMS,
      activeRoomId: 'general',
      messages: {},
      isStreaming: false,
      abortController: null,

      setActiveRoom: (roomId) => set({ activeRoomId: roomId }),

      addRoom: (room) =>
        set((state) => ({ rooms: [...state.rooms, room] })),

      updateRoom: (roomId, updates) =>
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId ? { ...r, ...updates, updatedAt: Date.now() } : r
          ),
        })),

      deleteRoom: (roomId) =>
        set((state) => ({
          rooms: state.rooms.filter((r) => r.id !== roomId),
          activeRoomId: state.activeRoomId === roomId ? 'general' : state.activeRoomId,
          messages: Object.fromEntries(
            Object.entries(state.messages).filter(([k]) => k !== roomId)
          ),
        })),

      updateRoomADHD: (roomId, config) =>
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId
              ? { ...r, adhdConfig: { ...r.adhdConfig!, ...config }, updatedAt: Date.now() }
              : r
          ),
        })),

      addMessage: (roomId, message) =>
        set((state) => {
          const roomMessages = state.messages[roomId] || [];
          return {
            messages: {
              ...state.messages,
              [roomId]: [...roomMessages, message],
            },
            rooms: state.rooms.map((r) =>
              r.id === roomId
                ? {
                    ...r,
                    messageCount: r.messageCount + 1,
                    lastMessage: message.content.slice(0, 80),
                    lastMessageAt: message.timestamp,
                    updatedAt: Date.now(),
                  }
                : r
            ),
          };
        }),

      updateMessage: (roomId, messageId, content) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [roomId]: (state.messages[roomId] || []).map((m) =>
              m.id === messageId ? { ...m, content } : m
            ),
          },
        })),

      clearRoomMessages: (roomId) =>
        set((state) => ({
          messages: { ...state.messages, [roomId]: [] },
          rooms: state.rooms.map((r) =>
            r.id === roomId ? { ...r, messageCount: 0, lastMessage: undefined } : r
          ),
        })),

      clearAllMessages: () =>
        set({
          messages: {},
          rooms: DEFAULT_ROOMS.map((r) => ({ ...r, messageCount: 0, lastMessage: undefined })),
        }),

      setStreaming: (streaming) => set({ isStreaming: streaming }),

      setAbortController: (controller) => set({ abortController: controller }),

      abortStream: () => {
        const { abortController } = get();
        if (abortController) {
          abortController.abort();
          set({ isStreaming: false, abortController: null });
        }
      },

      getActiveRoom: () => {
        const state = get();
        return state.rooms.find((r) => r.id === state.activeRoomId);
      },

      getActiveMessages: () => {
        const state = get();
        return state.messages[state.activeRoomId] || [];
      },

      getRoomMessages: (roomId) => {
        return get().messages[roomId] || [];
      },
    }),
    {
      name: 'seb-atlantis-rooms-v4',
      storage: createJSONStorage(() => localStorage),
      version: 4,
      partialize: (state) => ({
        rooms: state.rooms,
        activeRoomId: state.activeRoomId,
        messages: state.messages,
      }),
    }
  )
);
