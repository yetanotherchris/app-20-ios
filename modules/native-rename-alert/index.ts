// Re-export the native module. On web, it will be resolved to NativeRenameAlertModule.web.ts
// and on native platforms to NativeRenameAlertModule.ts
export { default } from './src/NativeRenameAlertModule'
export * from './src/NativeRenameAlert.types'
