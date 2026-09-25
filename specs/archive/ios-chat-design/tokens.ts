// Logical points. Use runtime safe-area and keyboard measurements.
export const colors = {
  background: '#FFFFFF',
  grouped: '#F2F2F7',
  composer: '#FAFAFA',
  primary: '#111111',
  secondary: '#6B6B70',
  border: '#D1D1D6',
  selected: '#E9E9ED',
  action: '#007AFF',
  disabledFill: '#E5E5EA',
  disabledInk: '#8E8E93',
  destructive: '#C62828',
  errorFill: '#FFF1F0',
  infoFill: '#EAF3FF',
  infoInk: '#0055B3',
} as const
export const layout = {
  touchMin: 44,
  headerMin: 56,
  pageInset: 16,
  composerInset: 12,
  composerRadius: 28,
  composerTop: 16,
  textInset: 16,
  textMin: 36,
  actionGap: 4,
  sendSize: 44,
  composerBottom: 12,
  keyboardGap: 8,
  lineHeight: 22,
  maxLines: 6,
  rowMin: 52,
  rowRadius: 14,
} as const
export type S3Draft = { bucket: string; region: string; accessKeyId: string; secretAccessKey: string; endpoint: string }
export type SettingsDraft = { apiKey: string; s3: S3Draft }
export type ImportedSettings = { apiKey?: string; s3?: Partial<S3Draft> }
export type LoadState = 'idle' | 'loading' | 'ready' | 'error'

export const behavior = {
  settingsDebounceMs: 600,
  latestShowDistance: 80,
  latestHideDistance: 40,
  latestButtonSize: 44,
  latestComposerGap: 12,
  latestScrollPadding: 68,
  editActionSize: 44,
  editGlyphSize: 20,
} as const
export const defaultModelLabel = 'Openrouter Auto'
