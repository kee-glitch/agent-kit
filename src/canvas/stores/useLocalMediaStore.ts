import { create } from 'zustand'

export interface LocalMediaEntry { file: File; objectUrl: string }

interface LocalMediaState {
  entries: Record<string, LocalMediaEntry>
  playbackByNodeId: Record<string, { currentTime: number; playing: boolean }>
  attach(nodeId: string, file: File): LocalMediaEntry
  remove(nodeId: string): void
  reset(): void
  setPlayback(nodeId: string, currentTime: number, playing: boolean): void
}

export const useLocalMediaStore = create<LocalMediaState>((set, get) => ({
  entries: {},
  playbackByNodeId: {},
  attach(nodeId, file) {
    const previous = Object.hasOwn(get().entries, nodeId) ? get().entries[nodeId] : undefined
    if (previous) URL.revokeObjectURL(previous.objectUrl)
    const entry = { file, objectUrl: URL.createObjectURL(file) }
    set((state) => ({ entries: { ...state.entries, [nodeId]: entry } }))
    return entry
  },
  remove(nodeId) {
    const entry = Object.hasOwn(get().entries, nodeId) ? get().entries[nodeId] : undefined
    if (!entry) return
    URL.revokeObjectURL(entry.objectUrl)
    set((state) => {
      const entries = { ...state.entries }
      delete entries[nodeId]
      return { entries }
    })
  },
  reset() {
    Object.values(get().entries).forEach(({ objectUrl }) => URL.revokeObjectURL(objectUrl))
    set({ entries: {}, playbackByNodeId: {} })
  },
  setPlayback(nodeId, currentTime, playing) {
    set((state) => ({ playbackByNodeId: { ...state.playbackByNodeId, [nodeId]: { currentTime, playing } } }))
  },
}))
