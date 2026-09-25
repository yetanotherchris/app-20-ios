const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')

const config = getDefaultConfig(__dirname)

// AWS exposes a React Native runtime configuration only through its ES module entrypoint.
config.resolver.resolverMainFields = ['react-native', 'browser', 'module', 'main']

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const opencodeDirectory = escapeRegExp(path.resolve(__dirname, '.opencode'))

// The local OpenCode index writes heartbeat files continuously; they are not app inputs.
config.resolver.blockList = [...(config.resolver.blockList ?? []), new RegExp(`^${opencodeDirectory}[/\\\\].*$`)]

module.exports = config
