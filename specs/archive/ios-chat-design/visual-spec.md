# iOS chat beta — visual implementation specification

All dimensions are logical iOS points / React Native layout units. Target: iPhone 16 portrait, 393 × 852; reference safe insets top 59, bottom 34. Read actual insets at runtime. Mockups are annotated design illustrations, not pixel measurement sources; the numeric rules and SVGs here govern implementation. Native keyboard/menu/alert appearance varies with installed iOS. Light appearance is the beta baseline; no theme control.

## Reference interpretation and scope

IMG_9052 supplies the two-row composer; IMG_9054 supplies the model capsule and two-line menu icon; IMG_9055 supplies the full-screen drawer and X. IMG_9053 informs Recent and Settings placement. IMG_9051 reinforces the text-over-actions composer anatomy; its dark theme is not applied. References disagree on composer shape, so this package deliberately selects the two-row variant. Existing message renderer remains authoritative except for the requested edit-and-resend action below every user prompt: illustrative messages/timestamps in PNGs do not require renderer changes.

Beta scope: send/view text messages, edit and resend a previous user prompt, select a configured model, create chat, latest five conversations, open/rename/delete conversation, edit/import API and S3 configuration. No attachment, voice, search, account, image-generation, sync controls, folders, share, pin, archive, or stop-generation controls. Conversation saves always write locally. With complete S3 credentials configured, mirror those saves to S3 as well. With no S3 keys, local saving is fully functional and no setup warning is shown. API key required to send; S3 is optional; a partly filled S3 group remains a draft until completed, while API and conversation saves continue independently. The selected model label is exactly **Openrouter Auto**. The beta menu contains that one configured option with a checkmark; render additional entries only if supplied by the existing model configuration. No remote model-loading UI.

## Inventory and hierarchy

| Surface      | Hierarchy / presentation                                                                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chat         | Safe-area root → fixed ChatHeader → existing flexible transcript → optional status banner → sticky Composer → bottom inset or native keyboard                          |
| Model picker | Native anchored menu attached to central model capsule; single selected item                                                                                           |
| History      | Opaque custom full-screen modal drawer sliding from left → fixed Chats/X header → scroll area containing New chat, Recent, five rows or status → fixed Settings footer |
| Row actions  | Native menu from row ellipsis or long press; Rename, Delete                                                                                                            |
| Rename       | Native iOS text-input alert, selected current title, keyboard; Cancel/Save                                                                                             |
| Delete       | Native iOS destructive confirmation alert; Cancel/Delete                                                                                                               |
| Settings     | Native large page sheet over drawer (or chat when entered through missing-key notice); fixed icon toolbar → independently scrolling grouped form                       |
| Import       | Native single-document Files picker over Settings; result status inline in Settings                                                                                    |

## Tokens

| Token        | Hex            | Use                                                                  |
| ------------ | -------------- | -------------------------------------------------------------------- |
| background   | #FFFFFF        | Chat, drawer, field cells                                            |
| grouped      | #F2F2F7        | Settings background, header capsule                                  |
| composer     | #FAFAFA        | Composer fill                                                        |
| primary      | #111111        | Main text/icons                                                      |
| secondary    | #6B6B70        | Labels, placeholder, helper                                          |
| border       | #D1D1D6        | Composer and field boundaries                                        |
| selected     | #E9E9ED        | Current conversation                                                 |
| action       | #007AFF        | Enabled icon controls, caret, native actions                         |
| disabledFill | #E5E5EA        | Disabled send circle                                                 |
| disabledInk  | #8E8E93        | Disabled icon; use this, not white arrow shown in some illustrations |
| destructive  | #C62828        | Inline error text/icons; native destructive actions use system red   |
| errorFill    | #FFF1F0        | Inline error background                                              |
| infoFill     | #EAF3FF        | Import success and setup notice                                      |
| infoInk      | #0055B3        | Text on infoFill                                                     |
| scrim        | #000000 at 30% | Fallback modal dimming; native presentations own their dimming       |

Use iOS system font (San Francisco), `allowFontScaling=true`. Font table is default content-size category; scale font and line height together, don't clip with fixed text-container heights.

| Role                                   | Size / weight / line height | Color                                         |
| -------------------------------------- | --------------------------- | --------------------------------------------- |
| Drawer title                           | 28 / 700 / 34               | primary                                       |
| Empty-state title                      | 22 / 500 / 28               | primary                                       |
| Sheet title                            | 17 / 600 / 22               | primary                                       |
| Model capsule                          | 17 / 500 / 22               | primary                                       |
| Body, field value, composer, row label | 17 / 400 / 22               | primary                                       |
| Recent / group heading                 | 15 / 600 / 20               | secondary                                     |
| Field label, helper, banner            | 13 / 400 / 18               | secondary; error/info tokens where applicable |
| Native menu / alert                    | System semantic styles      | System colors                                 |

## Header

Safe top then 56pt header, horizontal padding16. Left icon button x16/y65, 44×44; right x333/y65, 44×44. Circular white fills, 1pt border. Icons 24×24 centered, 2pt rounded strokes. Menu is exactly two equal horizontal strokes, not a three-line hamburger. Center capsule width=min(208, available width), height44, radius22; horizontal padding16; label flex-shrinks with one-line tail ellipsis, 8pt gap to 16pt down-chevron which never shrinks. Center the capsule in the available space between 12pt gaps from side buttons. Very long model title is announced in full to accessibility services.

No divider between composer rows. Focused config fields use1pt action-blue border; error border takes precedence. No strong shadow: icon controls and composer use black shadow opacity .04, offset (0,2), radius8. Native menus and sheets use system shadow/material. Do not imitate glass with gradients.

## Composer — exact geometry

One outer rounded rectangle contains TWO VERTICAL ROWS. Text is above the send action, never beside it. No accessory buttons occupy the blank lower-left area.

- Outer x=12, width=W−24 (369 at target), radius28, border1, fill composer. Default minimum height112.
- Top padding16. Text left/right inset16: x=28 globally, width337. Text baseline follows 17/22 body metrics; placeholder exactly **Ask anything**. Clear native default TextInput padding; set padding0. At one line allocate a minimum36pt text region.
- Text region height `T=max(36,min(measuredTextHeight, maxTextHeight))`; the iOS composer uses `maxTextHeight=242` (eleven 22pt lines), supporting ten Return presses before the input scrolls internally. Gap4 below text region.
- Action row height44, horizontal inset12; only send, aligned to the right. Bottom padding12. Thus outer height=`16+T+4+44+12 = T+76`: 112 one line, 142 three 22pt lines, 318 eleven lines.
- Send diameter44, radius22, arrow-up glyph22 centered; global x=W−68=325, y=outerBottom−56. No additional enclosing square. Enabled blue/white; disabled disabledFill/disabledInk. Entire circle is touch target. Never shrink it for long text.
- Keyboard closed: outer bottom=H−safeBottom−12=806; default top694. Keyboard open: outer bottom=keyboardTop−8; illustrative keyboardTop516 → bottom508 and default top396. Use actual keyboard frame, not 336 hardcoded height.
- Parent footer fills background through safe bottom. It is a sibling of transcript, not absolutely superimposed on messages. Banner lives above composer, 8pt gap, x12; its height grows from wrapped text, with 12pt padding and radius12. Banner never overlays text/input.
- Whitespace-only draft, absent API key, unavailable configured model, or pending send disables send. Drafts remain editable except during a send; while sending hold input read-only and preserve focus/keyboard. No stop button.
- Send: retain draft in state until request succeeds; show pending message once using stable client id. On failure roll back pending duplicate and restore draft and focus state. Retry uses same send button and idempotency semantics of existing transport. No duplicated user bubbles. After success clear input and retain keyboard if it was visible. Error goes away on new send or draft edit.

## Edit and resend a prompt

Below EVERY user message bubble place an action row with a pencil glyph20pt centered in44×44 transparent button, right-aligned to the bubble's right edge. Gap4 from bubble bottom; gap12 from action row to next message. Use secondary ink, blue when selected, disabledInk while any send is pending. Accessibility label “Edit and resend message”; include a concise source-message excerpt. No such button under assistant messages. Integrate this action into the existing message cell without changing message typography.

Tapping copies the complete source prompt into the composer and focuses native keyboard. It does not immediately send. Save any existing composer draft in memory. Above composer show a44pt row, label “Edit and resend”15/20 secondary at x16 and X44 at right, gap8 to composer. Source pencil becomes blue; announce edit mode. User can edit normally. Arrow sends a NEW message at the end of the same conversation, preserving original prompt and replies; no branching selector or destructive rewrite. After success, exit edit mode and restore the prior draft (or empty input). Cancel X exits and restores prior draft without sending. Error retains edited text and edit mode; use existing send-error banner. Empty edited text disables send. While sending disable pencil buttons to prevent conflicting edits. Switching source while editing replaces edit buffer and preserves the originally parked draft; switching conversations stores each draft/edit state with its conversation. New chat does not erase another conversation's draft.

## Keyboard and scrolling

Use native iOS keyboard, native prediction, selection, paste, autocorrection and sentence capitalization for message text. Return adds newline; send is exclusively the arrow control. Do not implement a QWERTY keyboard or force suggestion text to match PNGs. Native dictation/globe controls are OS-owned, not app voice features.

Keep header stationary. Keyboard appearance reduces the transcript viewport; dock composer to keyboard with 8pt gap. Remove closed-keyboard safe-bottom padding while software keyboard is visible to avoid a double gap. Hardware keyboard uses the closed layout. Track frame changes (including interactive dismissal), not just initial height. Use one keyboard avoidance owner; don't combine automatic keyboard inset and manual keyboard-height padding on the same container. A full-root `KeyboardAvoidingView` with iOS `behavior="padding"` is an available implementation, with offset derived from actual navigation layout. [React Native KeyboardAvoidingView](https://reactnative.dev/docs/keyboardavoidingview).

Set message input multiline with newline submit behavior; compute growth via content-size measurements and enable internal scroll only at cap. React Native supports native text scaling and multiline input configuration. [React Native TextInput](https://reactnative.dev/docs/textinput).

Transcript uses existing scroll behavior, with trailing padding68pt to keep the latest-message control clear; if within40pt of end, keep latest content visible as keyboard/composer changes; otherwise preserve reading position. Drag transcript dismisses keyboard interactively; tapping blank transcript dismisses. `keyboardShouldPersistTaps="handled"` ensures send works on the first tap. Opening drawer, model menu or Settings dismisses keyboard; closing those surfaces does not auto-focus composer. New chat also starts unfocused. Native rename alerts auto-focus title field.

## Scroll to latest — appearance and scenarios

A floating44×44 grouped (#F2F2F7) circle, radius22, border1 #D1D1D6, shadow black .10 offset(0,2) blur8; down-arrow22 #111111 centered. Accessible label “Scroll to latest message”. It is horizontally centered at x=(W−44)/2. Its bottom is12pt above the TOP of the complete composer stack (including edit/status/error rows), not above keyboard directly. It floats over transcript; transcript reserves68pt trailing padding so message controls can be reached without obstruction. Hit-testing is limited to the circle. No unread counter, text pill, badges or new-message functionality.

Calculate distance `d=max(0, contentHeight − viewportHeight − offsetY)` in normalized non-inverted coordinates, including transcript padding. Show if d>80pt, hide if d≤40pt; retain previous visibility between40 and80 to avoid flicker. Don't show while list is empty, initial loading, non-scrollable, obscured by modal, or before initial position restoration. If an inverted list is retained, normalize its offset to equivalent distance rather than reusing the formula blindly. Content/viewport changes must recompute distance, not just scroll events.

| Scenario                                                 | Expected behavior                                                                                                                                                           |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open conversation                                        | After content measurement, position at latest and hide button; when intentionally restoring older reading position, honor it and show if >80pt away.                        |
| User scrolls upward                                      | Disengage automatic following immediately; preserve visible message-id and within-message offset. Show after crossing80pt.                                                  |
| User manually reaches bottom                             | Hide within40pt and resume automatic following.                                                                                                                             |
| New reply or streaming text while at latest              | Keep last content in view as it grows; button stays hidden. Determine following state BEFORE appending, not after distance changes.                                         |
| New reply or streaming text while reading older messages | Preserve reading anchor; do not auto-scroll. Button stays available. No forced focus announcement per token.                                                                |
| Tap down arrow                                           | Scroll to latest measured end; keep draft, selection and keyboard unchanged. Resume following, clear button once within40pt. For streaming, continue following new content. |
| Send / edit-and-resend                                   | Explicit send returns to latest after pending message is laid out, then follows response. Source prompt and earlier answers stay intact.                                    |
| Keyboard appears / disappears; composer grows            | If following, keep latest anchored; otherwise preserve reading message anchor. Button follows composer-stack top and never overlaps send or keyboard.                       |
| User cancels an animated jump by dragging                | Stop animation, disengage following; recompute visibility from actual position.                                                                                             |
| Older items load above viewport                          | Preserve stable message-id anchor and within-row offset; don't jump merely because contentHeight changed.                                                                   |
| Modal drawer/settings/menu opens                         | Hide with chat background; restore correct visibility when chat is visible again.                                                                                           |
| No connection / failed send                              | Still usable: it scrolls existing content locally and makes no network request.                                                                                             |

Use approximately200ms native scroll animation for a nearby target; for many viewports away use direct jump to avoid a long sweep. Reduce Motion always jumps without animation. Announce “Latest message” on explicit activation when VoiceOver is enabled; do not steal accessibility focus on passive incoming messages. PNG32 shows reading older messages without keyboard; PNG33 shows same behavior with keyboard and draft. The hidden-at-latest state is visible in PNG02.

## History

Opaque width=W, height=H; no underlying chat strip. Drawer header safeTop+56; Chats x20 and X at W−60. Scroll area flex1 below header, content padding16, bottom16. New chat row min56, radius28, compose icon24 then gap12 and text. Gap24 before Recent, heading has bottom8. Conversation row min52, horizontal padding12, radius14, title flex1, gap8, trailing ellipsis touch target44. Default titles use one line with tail ellipsis; full title in accessibility label. Current conversation background selected; also announce selected=true. No extra checkmark needed.

Latest five ordered by last message activity descending; rename/open do not reorder; timestamp tie uses stable id. New chat creates an empty draft, persisted in history after first successfully saved user message. Titles derive from first message (first80 characters) until renamed. Only five shown: there is no 'See all' in beta. Deletion may reveal the next most recent record from existing persistence. These choices define display behavior, not a new storage system.

Footer height=56+safeBottom with top1pt border; gear24 + gap12 + Settings17, target min44; padding16 horizontally and bottom safeBottom. No account/profile. Scroll padding and footer are separate so last row stays reachable. Loading replaces only list region with ActivityIndicator and short label. Error replaces list with text and 44pt retry icon. Empty says No conversations yet. Native menu is fully clamped inside screen safe bounds with minimum8pt edge clearance (never extend beyond phone edge). Native menu from ellipsis/long press has only Rename with pencil and Delete with trash. Don't add swipe actions to beta.

Rename: native alert text field preselected, single line, horizontal scrolling. Trim ends, accept1–80 characters; no duplicate-name restriction. Empty/whitespace or >80 disables Save; helper 'Enter a name.' or 'Use 80 characters or fewer.' Native alert implementations without customizable validation must enforce maxLength80 and disabled Save through native binding; do not use an unstyled JS dialog. Cancel unchanged. Delete confirmation wraps full title, Cancel and destructive Delete. During local operation ignore repeat action; on failure keep title/row intact and show inline error beneath Recent (same visual pattern for rename failure). Deleting current chat opens a new empty draft after successful deletion.

## Settings and import

Native large page sheet (single large detent) with system grabber; header min56, Settings centered, X at right in44pt circle. No Save/check action, no Preferences, no response-style field and no discard dialog. Saving is automatic. Under title toolbar show compact status13/18 for local settings persistence (never upload credentials themselves to S3): “Saving…” with native spinner during write, “Saved” with check when persisted, or “Not saved” with red icon on error. Empty unchanged setup uses no status. X always dismisses; it does not discard values. On dismissal flush pending valid writes and retain drafts in the app state if validation or persistence fails. Reopening resumes the retained draft.

Autosave: debounce text changes600ms; blur, keyboard Done or close flushes immediately when valid. Persist API independently of S3. For S3, wait until all four required values are present or all fields are deliberately cleared; never overwrite a complete saved group with a partial group. Keep partial values in draft state and show “Complete S3 Keys to save.” No success claim until persistence completes. If a write is pending, coalesce latest edits and serialize writes to prevent stale values winning. A failure retains the latest draft and last successful saved configuration; error row offers44pt circular-arrow retry. Import merges into the same draft and follows the same automatic validation/persistence path; no review/confirm screen. Closing during a write lets that write finish; reopening shows its result.

Form is ScrollView, horizontal padding16, content bottom24+safeBottom, section gap24. The import action is titled exactly “Import from JSON file”; no DATA heading. It is full-width white row min52 radius12 with document-download24, gap12, title17; inline result beneath with gap8. Fields in white grouped cards radius12; 1pt border; each label13 above value17 with gap6, padding12, min74 height; group separators1pt inset12. Error helper below value gap4 and error border. Values single-line horizontally scrolling; labels/helpers wrap. API key and Secret access key each have a trailing eye toggle:24pt eye glyph in44pt target inside the field, right inset4. Reserve52pt field space for it so text never runs underneath. Masked by default; tap eye reveals just that field, icon becomes eye-slash. Tap again masks it. Accessibility labels Show API key / Hide API key and Show secret access key / Hide secret access key; announce expanded state. Keep value, selection, focus and keyboard stable when toggling secure entry. Remask on closing Settings, app backgrounding, and after importing replacement values. Empty secret fields show disabled gray eye. Access key ID is ordinary text and has no eye. API key and S3 secret use secure text fields until explicitly revealed and are never shown in success/error banners. All config fields disable autocorrect/capitalization. URL field uses URL keyboard. On focus scroll field plus helper above keyboard with16pt clearance; fixed header remains reachable. No bottom action bar. Section headings are exactly “API key” and “S3 Keys”. The input label inside the API section may repeat “API key” for clarity.

Field order: API key; S3 Bucket, Region, Access key ID, Secret access key, Endpoint (optional). API key may be blank for S3-only saved setup; sending still requires it. S3 all blank is valid. If any S3 value is present, Bucket/Region/Access key ID/Secret are required. Endpoint may be omitted (use AWS regional default) or must be absolute HTTPS URL. Whitespace trims on automatic persistence/import except internal characters. This is syntactic validation, not credential verification; don't add Test connection or claim keys are valid. Store secret values using the app's protected storage; Expo SecureStore is intended for encrypted local key/value storage. [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).

The requested button label says JSON; plain-text support from the original brief is retained as well. Import row opens native document picker: one `.txt` or `.json` file, no camera/gallery. Support UTF-8 (optional BOM), maximum1MiB. Picker cancel leaves draft/status unchanged. Use Expo DocumentPicker single-selection with a cache copy for immediate reading. [Expo DocumentPicker](https://docs.expo.dev/versions/latest/sdk/document-picker/).

JSON contract (all properties optional, provided ones must be strings; `s3` object). A plain text file supports either a raw API key on a single line OR KEY=value lines using names below. Split on first '='; blank lines ignored; no JSON-like guessing. Duplicate keys, unknown keys, invalid types, invalid encoding, and empty file fail with actionable inline message; preserve previous draft atomically. Successful import merges only provided values into draft; empty provided string clears that value. Valid imported groups save automatically; partial S3 groups remain in draft with ordinary validation. Success says “Imported chat-settings.json. Saved.” only after persistence succeeds. While persisting say “Imported chat-settings.json. Saving…”. If persistence fails, use the ordinary save-error banner and retry icon. Values never appear in logs or banners.

```json
{
  "apiKey": "EXAMPLE_NOT_A_REAL_KEY",
  "s3": {
    "bucket": "weekend-chat-beta",
    "region": "eu-west-1",
    "accessKeyId": "AKIAEXAMPLEONLY",
    "secretAccessKey": "EXAMPLE_NOT_A_REAL_SECRET",
    "endpoint": "https://s3.eu-west-1.amazonaws.com"
  }
}
```

```text
API_KEY=EXAMPLE_NOT_A_REAL_KEY
S3_BUCKET=weekend-chat-beta
S3_REGION=eu-west-1
S3_ACCESS_KEY_ID=AKIAEXAMPLEONLY
S3_SECRET_ACCESS_KEY=EXAMPLE_NOT_A_REAL_SECRET
S3_ENDPOINT=https://s3.eu-west-1.amazonaws.com
```

## Optional S3 and save destination

Under “S3 Keys” show13/18 secondary helper: **“Optional. Without S3 keys, chats save on this device.”** With a complete configured group, use **“Chats save on this device and to S3.”** This text describes configured destinations, not confirmation of remote connectivity. API keys and S3 secret credentials stay in protected device storage; “both local and S3” applies to conversation data, not exporting credentials.

| S3 state                    | Conversation save behavior / UI                                                                                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All S3 fields absent        | Save locally; no error or disabled chat. Helper explains local destination.                                                                                                                                    |
| Complete S3 configuration   | Commit locally first, then mirror to configured S3. Do not block viewing or sending on remote latency.                                                                                                         |
| Partial newly entered group | Keep working local saves; retain previous complete configuration if present. Show inline required-field validation in Settings; new partial credentials don't activate remote writes.                          |
| S3 mirror fails / offline   | Local save remains successful. Show nonblocking chat banner “Saved on this device. Couldn’t save to S3.” with44pt retry icon. Retry mirrors pending conversation changes; it does not resend the model prompt. |
| S3 is removed entirely      | Future saves stay local; no remote deletion is implied.                                                                                                                                                        |

Serialize queued remote writes by conversation revision so old content cannot overwrite newer content. If retries are automatic in existing persistence, preserve that behavior; the retry button provides explicit recovery for this error state. For rename/delete, apply local change first and mirror the same operation when configured; remote failure never falsely reports that local data was lost. The same destination error pattern covers those failures. No new sync settings, sync-progress screen, or connectivity test button. PNG35 shows the S3 mirror failure banner; PNG16 shows optional empty S3, PNG17 configured S3, PNG34 revealed API key.

## Accessibility, small screens, motion

All interactive bounds at least44×44; decorative glyphs hidden from accessibility. Label icon controls: Open conversations, New chat, Choose model (current name), Close conversations, Conversation actions (full title), Settings, Send message, Retry loading conversations, Import from JSON file, Edit and resend message, Cancel edit and resend, Close settings, Retry saving settings. Announce busy/disabled/selected state and concise success/error updates; move VoiceOver focus into modal then back to invoker. Prevent background accessibility traversal while modal open. Use text as well as color for errors. [Apple layout guidance](https://developer.apple.com/design/human-interface-guidelines/layout).

At accessibility text sizes (fontScale≥1.4 for layout branching), history titles wrap without line cap, rows grow; model pill may wrap to two lines and header height grows to fit while icons remain44. Use column flex layout, never fixed screen coordinates in implementation. Settings labels/helpers grow, form scrolls; native alert and menus use OS accessibility layout. Footer row grows with text. At320–375pt widths keep composer margins12 and side header targets44; shrink central pill before shrinking icons.

Composer max text height=min(6×scaled lineHeight, 35% of usable region between header and keyboard/footer), but never below one scaled line. Its min text region is max(36, scaled lineHeight). For small screen + keyboard + accessibility text, allow transcript to collapse to zero before occluding input/send; text internally scrolls and empty-state copy disappears when it cannot fit. No font-size caps or transform scaling. Long URLs horizontal-scroll inside input; helper text always wraps.

Drawer slide from left approximately250ms using system-like easing; Reduce Motion uses short crossfade. Keyboard follows system animation curve/duration and interactive progress. Native sheet/menu/alert animations remain native. Spinners use native ActivityIndicator; no shimmer, bouncing dots or decorative animation.

## State coverage

See `state-index.md` for every PNG, trigger and visible difference. Successful rename/delete return to populated or empty drawer; successful automatic save stays in Settings with “Saved” status (PNG28). Focused/unfocused filled inputs reuse the same geometry. Models are bundled, so no independent network loading/error state for picker. Operation loading reuses native spinner; rename failure uses the history mutation error banner. No dark-theme state is promised.

## Implementation checks

Validate on393×852 and320/375pt widths, with keyboard prediction enabled/disabled and accessibility largest text: composer unobscured,44pt hit targets, no transcript/footer collision, all five history rows reachable; edit icons present beneath every user message. Test send empty/pending/failed; partial imports preserve unspecified fields; failed import changes none; automatic save on edit/blur/close; delete current versus another chat; secrets start masked and the eye toggles one field at a time. Use the app's existing Expo-compatible native menu/alert components; if absent, add native bindings in a development build rather than fake a system menu with unsupported Expo Go assumptions. No app runtime code or dependency versions are prescribed by this design package.

## Asset list

- PNGs: 35 separate annotated state images under `mockups/`, enumerated in `state-index.md`; each depicts one iPhone16 screen with external annotations, no collage. Export canvases are1024×1536px; inset phone artwork represents393×852pt and is not a raw3× screenshot.
- SVGs: `menu-equal.svg`, `compose.svg`, `chevron-down.svg`, `close.svg`, `send.svg`, `more.svg`, `pencil.svg`, `trash.svg`, `settings.svg`, `import.svg`, `check.svg`, `retry.svg`, `error.svg`, `arrow-down.svg`, `eye.svg`, `eye-off.svg`. All24×24 viewBox,2pt rounded strokes,currentColor; chevron rendered16, send22, others24. Native menu symbols may use SF Symbols equivalents.
- Images/illustrations in app: none. Phone hardware, status bar, keyboard, document glyphs and native UI in mockups are presentation/system elements, not shipped images.
- Supporting files: `tokens.ts`, example JSON/TXT configuration, final generation prompts, state index. No branding or user avatar asset required.

PNG filenames (each is a separate image):

- `01-chat-empty.png`
- `02-chat-populated.png`
- `03-chat-keyboard-empty.png`
- `04-chat-keyboard-multiline.png`
- `05-chat-sending.png`
- `06-chat-send-error.png`
- `07-model-menu.png`
- `08-drawer-selected.png`
- `09-drawer-empty.png`
- `10-drawer-loading.png`
- `11-drawer-error.png`
- `12-history-actions.png`
- `13-rename-keyboard.png`
- `14-rename-disabled.png`
- `15-delete-alert.png`
- `16-settings-empty.png`
- `17-settings-populated.png`
- `18-settings-keyboard.png`
- `19-settings-validation.png`
- `20-settings-saving.png`
- `21-import-picker.png`
- `22-import-loading.png`
- `23-import-error.png`
- `24-import-success.png`
- `25-settings-save-error.png`
- `26-drawer-large-text.png`
- `27-chat-long-draft.png`
- `28-settings-saved.png`
- `29-history-mutation-error.png`
- `30-chat-missing-key.png`
- `31-chat-edit-resend.png`
- `32-chat-scroll-latest.png`
- `33-chat-scroll-latest-keyboard.png`
- `34-settings-secret-visible.png`
- `35-chat-s3-save-error.png`
