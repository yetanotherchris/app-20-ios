const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// AWS exposes a React Native runtime configuration only through its ES module entrypoint.
config.resolver.resolverMainFields = ['react-native', 'browser', 'module', 'main']

module.exports = config
