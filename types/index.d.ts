export type BtwEntry = { id: string; question: string; answer: string | null; at: string }

declare module 'claude-code' {
  interface PluginState {
    // toggled：使用者點過的展開狀態，沒點過的照預設（最新一則展開）
    'btw-plus': { history: BtwEntry[]; toggled: Record<string, boolean> }
  }
}
