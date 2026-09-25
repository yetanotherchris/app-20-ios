# Contract: Shared Component API Changes

Changes are in `../app-20-llmchat`. The package is beta; API may change without notice. Defaults preserve current desktop behavior.

## `useAtBottom`

```ts
export function useAtBottom(
  threshold: number,
  onAtBottomChange?: (isAtBottom: boolean) => void,
  showThreshold?: number,
): AtBottomState

export interface AtBottomState {
  isAtBottom: boolean
  isAtBottomRef: React.RefObject<boolean>
  showScrollToLatest: boolean
  update: (metrics: ScrollMetrics) => void
}
```

- `isAtBottom` is true when `distanceFromBottom(metrics) <= threshold`.
- `showScrollToLatest` is true when `distanceFromBottom(metrics) > showThreshold`, false when `<= threshold`, and retains its previous value between the two.
- When `showThreshold` is undefined or `<= threshold`, `showScrollToLatest` equals `!isAtBottom`.
- `onAtBottomChange` fires only on `isAtBottom` transitions.

## `MessageListProps` additions

| Prop                          | Type     | Default            | Behavior                                                                                                           |
| ----------------------------- | -------- | ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `scrollToLatestShowThreshold` | `number` | `followThreshold`  | Show threshold for the latest control (see `useAtBottom`).                                                         |
| `listTrailingPadding`         | `number` | `0`                | Added to the list content container as `paddingBottom`.                                                            |
| `scrollToLatestAnnouncement`  | `string` | `'Latest message'` | Announced via `AccessibilityInfo.announceForAccessibility` on explicit activation when a screen reader is enabled. |

The overlay renders when `showScrollToLatest` is true, not when `!isAtBottom`.

The list recomputes distance on scroll, on viewport layout change, and on content size change, so streaming text, composer growth, and keyboard frame changes update visibility without a scroll event.

## `ChatProps` additions

`scrollToLatestShowThreshold`, `listTrailingPadding`, `scrollToLatestAnnouncement`, and `composerFocusRequest` are forwarded. `composerFocusRequest` is a monotonically increasing number; when it changes, the composer input receives focus.

## `ComposerProps` additions

| Prop           | Type     | Default     | Behavior                                      |
| -------------- | -------- | ----------- | --------------------------------------------- |
| `focusRequest` | `number` | `undefined` | When the value changes, focus the text input. |

## Compatibility

- Omitting every new prop yields the current behavior: `followThreshold` default 96, no trailing padding, no announcement, no focus request.
- Existing tests for the overlay (distance 100 vs threshold 96) continue to pass because `showScrollToLatest` falls back to `!isAtBottom`.
