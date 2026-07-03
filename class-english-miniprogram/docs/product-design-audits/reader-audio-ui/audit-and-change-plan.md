# Reader Audio UI Audit And Change Plan

Date: 2026-07-02

## Product Design Brief

Surface: WeChat mini program reader page.

User goal: read English text, tap or long-press sentence/word controls, and clearly understand when pronunciation or full-article reading is available.

Visual source: two real-device/devtools screenshots supplied by the user.

Interactivity target: full interaction in the production mini program, with reliable audio feedback when audio assets exist and clear unavailable feedback when they do not.

## Evidence

1. `01-reader-page-audio-control.png`
   - Reader page with article hero image, top controls, sentence text, inline play marks, and bottom tab bar.
   - General health: main reading surface is much improved; audio controls are visually weak and semantically unclear.

2. `02-reader-settings-open.png`
   - Reader page with settings sheet open.
   - General health: settings panel is clean and understandable; top controls still compete with the WeChat capsule and look uneven.

## Root Cause: No Sound

The current `src/utils/tts.ts` does not produce real audio. It keeps an `innerAudio` variable but never creates an `InnerAudioContext`, never assigns a `src`, and never calls `play()`. `speakText()` calls `speakSimulated()`, which only estimates duration and fires callbacks with `setTimeout`.

So the user-visible symptom is correct: tapping pronunciation can change UI state, but there is no real sound source.

Design implication: the UI must not promise real pronunciation unless an `audioUrl` or other playable source exists. Until backend audio assets are ready, the control should show a short unavailable state rather than silently pretending to play.

## Product Design Findings

### Strengths

- The hero image and scroll-bound gradient now give the reading page a more polished, article-specific first impression.
- The body text is readable, centered within a stable column, and the reading-first direction is right.
- The settings sheet has a good lightweight structure: handle, title, segmented font control, night mode, and vocabulary link.

### UX Risks

1. Top audio icon looks temporary.
   - The musical note character is too decorative and too large compared with `Aa`.
   - It looks like a glyph pasted into the nav, not a designed control.

2. Audio control intent is unclear.
   - `♫` could mean music, pronunciation, read aloud, or sound.
   - In a reading app, the primary concept is "朗读" or "发音", not music.

3. Top controls are spatially crowded.
   - The audio button sits close to the WeChat capsule area and competes with the system UI.
   - `Aa` and audio have different visual weights, making the header feel unbalanced.

4. Inline sentence play mark is too tiny.
   - The small green triangle after each sentence is easy to miss and hard to tap.
   - It looks like punctuation rather than a control.

5. Audio failure has no strong user feedback.
   - Since there is no real audio backend yet, the UI needs an honest "音频准备中" state.
   - Silent failure damages trust, especially in a language-learning product.

### Accessibility Risks

- The tiny inline play marker likely misses comfortable touch target size.
- Musical-note-only controls lack clear accessible meaning.
- Active audio state is color/glyph dependent; it needs a shape/state change and text fallback in toast or sheet copy.
- Screenshot-only review cannot verify screen reader labels, actual tap target bounds, audio session permissions, or real-device sound settings.

## Recommended Direction

Use a restrained "audio capsule" system instead of loose text glyphs.

The reader should have three audio surfaces:

1. Header full-article read aloud
   - Replace the `♫` glyph with a compact circular icon button.
   - Use a real icon from an icon library or a native image asset: `volume-2`, `play`, `pause`, or `radio`.
   - Recommended default: `Volume2`-style speaker with two waves.
   - Active state: green accent fill, white icon, subtle pulsing ring only while playing.
   - Unavailable state: muted speaker icon, low opacity, toast: `音频还在准备中`.

2. Sentence-level pronunciation
   - Replace the tiny trailing `▸` with a small rounded audio chip beside the active sentence only.
   - Default body should stay clean; do not show a play mark after every sentence.
   - On long-press sentence popover, keep a `朗读` action with the same speaker icon.
   - If sentence audio exists, play cached audio; if not, show `这句音频稍后补充`.

3. Word card pronunciation
   - Replace `♪` with the same speaker icon system.
   - Put it in a 32-36px circular button beside phonetic text.
   - When pressed, show a 300ms pressed state; if no audio exists, show `单词音频稍后补充`.

## Visual Specification

### Header Controls

- Keep `Aa` as a 42px circular button.
- Add `reader-audio-button` as a matching 42px circular button.
- Layout order: back arrow, title group, controls group.
- Controls group should stop before the WeChat capsule safe area.
- Use equal size and vertical alignment for `Aa` and audio.
- Avoid using large serif/glyph characters for controls.

Suggested states:

- Idle: white translucent circle, 1px white border, soft shadow, dark speaker icon.
- Playing: accent green circle, white speaker/pause icon, optional small waveform dots inside the button.
- Loading: white circle, small spinner or three-dot pulse, disabled tap repeat.
- Unavailable: white circle, muted speaker icon, toast after tap.

### Sentence Audio

- Remove always-visible trailing `reader-body__play-mark`.
- Keep reading surface calm by showing sentence audio only in the sentence popover.
- Optional later enhancement: when a sentence is currently playing, show a slim 2px accent progress line under that sentence.

### Settings Sheet

- Current settings sheet is acceptable.
- Minor refinement: when audio is unavailable globally, settings could include a small read-only row:
  `发音资源  准备中`
- Do not put audio configuration in settings for MVP unless multiple voices or speeds exist.

## Technical Change Plan

### Phase 1: Honest Audio States

- Add an audio availability model:
  - `ready`: playable `audioUrl` exists.
  - `missing`: no audio asset yet.
  - `loading`: user tapped and audio is resolving.
  - `playing`: current audio is playing.
  - `failed`: playback error.
- Update `tts.ts` so the current simulated path is clearly named as fallback, not real playback.
- When no `audioUrl` exists, show toast instead of pretending playback occurred.

### Phase 2: Real Cached Audio Playback

- Extend learning content data to expose sentence and word `audioUrl`.
- Update `speakText` or a new `playAudioAsset` function:
  - create `uni.createInnerAudioContext()`
  - assign `src`
  - listen for `onPlay`, `onEnded`, `onError`
  - call `play()`
  - clean up on stop/unmount.
- Keep provider/API key only in cloud functions.

### Phase 3: UI Polish

- Replace `♫`, `♪`, `■`, and sentence `▸` with real icon assets or an icon component strategy compatible with mp-weixin.
- Add a consistent `.reader-icon-button` base style.
- Create specific classes:
  - `.reader-audio-button`
  - `.reader-audio-button--playing`
  - `.reader-audio-button--loading`
  - `.word-sheet__speak`
  - `.reader-sentence-popover__action-icon`
- Update UI smoke checks to forbid the old glyphs and require new audio button markers.

## Acceptance Criteria

- Tapping the header audio control no longer silently pretends to play when no audio exists.
- If no audio asset is available, user sees a clear toast within 300ms.
- If `audioUrl` is available, real sound plays through `InnerAudioContext`.
- Header audio button visually matches the quality of `Aa` and does not collide with the WeChat capsule.
- Word-card pronunciation and sentence popover pronunciation use the same icon language.
- The reading body no longer has tiny always-visible play triangles after every sentence.

## Suggested Next Implementation Scope

Implement Phase 1 and Phase 3 first. That gives the user a more premium and honest UI immediately.

Implement Phase 2 when backend `audioUrl` data is available, or add one local test audio asset as a temporary integration fixture if real backend audio is not ready yet.
