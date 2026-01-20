Pod::Spec.new do |s|
  s.name           = 'MidiController'
  s.version        = '1.0.0'
  s.summary        = 'MIDI controller module for Expo'
  s.description    = 'A native module for MIDI device connection and transport/clock sync'
  s.author         = ''
  s.homepage       = 'https://github.com/expo/expo'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,mm,swift}'
end
