# WeChat Mini Program Working Rules

This project is a WeChat mini program first.

- Use 微信开发者工具 as the final product surface.
- Do not use H5 浏览器预览作为验收 for reading-page interaction quality.
- 不以 H5 浏览器预览作为验收.
- Import project root in WeChat DevTools: `D:\芸\英语\class-english-miniprogram`.
- After reader UI or interaction changes, run `npm.cmd run build:mp-weixin`.
- `npm.cmd run build:mp-weixin` builds `dist/build/mp-weixin` and syncs the result into root fallback mini-program files.
- `npm.cmd run build:mp-weixin` syncs `dist/build/mp-weixin` into the root fallback mini-program files.
- Inspect `dist/build/mp-weixin` for WXML event structure before calling work complete.
- Also inspect root fallback files when DevTools shows stale UI, because DevTools now reads the project root directly.
- In WeChat DevTools, the user can click compile directly after a new build; re-import is not required.
- Keep interactive reading popovers small and non-blocking so they do not cover the sentence being studied.
- Sentence translation should render as a compact bubble/popover that does not occupy article layout space or cover the active sentence.
- Word lookup should stay compact. It should feel like a small study card, not a bottom drawer.
- Default reader typography should be restrained for WeChat Mini Program reading: about 16px font size and 28px line height.
- The old bottom `reader-toolbar` must not return.
- If the same WeChat UI issue remains after two fixes, stop changing styles and verify the evidence chain: `src`, `dist/build/mp-weixin`, root fallback files, DevTools project path, and visible screenshot/version marker.
- When the thread gets long, treat this file and `npm.cmd run check:ui` as the source of truth before making reader changes.
