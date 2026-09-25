import { NativeModule, requireNativeModule } from 'expo'

declare class NativeRenameAlertModule extends NativeModule<Record<string, never>> {
  prompt(initialValue: string): Promise<string | null>
}

export default requireNativeModule<NativeRenameAlertModule>('NativeRenameAlert')
