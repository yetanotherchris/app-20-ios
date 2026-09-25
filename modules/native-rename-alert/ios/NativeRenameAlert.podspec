Pod::Spec.new do |s|
  s.name           = 'NativeRenameAlert'
  s.version        = '1.0.0'
  s.summary        = 'Native rename alert with validated Save action'
  s.description    = 'Presents a UIKit rename alert that prevents invalid titles from being saved.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
