import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      'app-20-llmchat': resolve(__dirname, 'node_modules/app-20-llmchat/dist/index.js'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: [resolve(__dirname, 'vitest.setup.ts')],
  },
})
