# Quickstart: iOS Chat Redesign Baseline

1. Install dependencies in both `app-20` and the adjacent `app-20-llmchat` package after linking the local component dependency.
2. Run `npm run typecheck` and `npm run test` from `app-20`.
3. Run `npm run lint`, `npm run typecheck`, and `npm test` from `app-20-llmchat`.
4. Start the iOS app with `npm run dev:ios` and verify the 35 states in `specs/ios-chat-design/state-index.md` on 393, 375, and 320 point widths, including largest accessibility text.
5. Verify failed local settings saves, failed S3 mirrors, and failed provider sends preserve drafts and local conversations.
