export type DocPath = string | null

declare module 'claude-code' {
  interface PluginState {
    'md-mermaid-pane': { path: DocPath }
  }
}
