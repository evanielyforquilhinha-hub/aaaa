# Reader UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the English mini-program reader into a premium white Apple-style reading experience and clean the most visible page defects.

**Architecture:** Keep the current uni-app Vue pages. Add a lightweight static smoke test for source-level UI regressions, then update page templates/styles in place with minimal logic changes.

**Tech Stack:** uni-app, Vue 3, TypeScript, SCSS, Node.js smoke script.

---

### Task 1: Static UI Smoke Check

**Files:**
- Create: `class-english-miniprogram/scripts/ui-smoke-check.cjs`
- Modify: `class-english-miniprogram/package.json`

- [ ] Add a Node script that reads the source pages and fails when debug overlays, known broken Chinese copy, or missing reader style markers are present.
- [ ] Run `node scripts/ui-smoke-check.cjs` and confirm it fails on current source.

### Task 2: Reader Page Refresh

**Files:**
- Modify: `class-english-miniprogram/src/pages/index/index.vue`

- [ ] Rework the reading page template to use a white editorial reader layout.
- [ ] Add reference-inspired metadata, rounded cover image, serif body text, muted translation, word highlighting, bottom toolbar, word sheet, and dark translation menu.
- [ ] Keep existing word lookup, add-to-vocab, line translation, and TTS logic working.

### Task 3: Copy And Debug Cleanup

**Files:**
- Modify: `class-english-miniprogram/src/pages/words/words.vue`
- Modify: `class-english-miniprogram/src/pages/me/me.vue`

- [ ] Remove the fixed red debug `1` overlays.
- [ ] Fix broken Chinese strings in empty state, flashcard labels, stats labels, and menu labels.

### Task 4: Verification

**Files:**
- Modify as needed based on failures.

- [ ] Run `node scripts/ui-smoke-check.cjs` and confirm it passes.
- [ ] Run `npm.cmd run build:mp-weixin` or H5 compile command and report the real output, including sandbox/environment limits if present.
