import { registerWebModule, NativeModule } from 'expo'

class NativeRenameAlertModule extends NativeModule<Record<string, never>> {
  prompt(): Promise<null> {
    return Promise.resolve(null)
  }
}

export default registerWebModule(NativeRenameAlertModule, 'NativeRenameAlert')
