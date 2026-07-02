# Reader UI Refresh Design

## Goal

Create a polished Apple-style English reading experience inspired by the provided reference screenshots, while keeping the current uni-app/Vue codebase and local vocabulary flow intact.

## Scope

- Refresh the reading page into a white, immersive reader with generous spacing, large editorial title, article metadata, rounded cover image, book-like English typography, muted Chinese translation, and a clean bottom toolbar.
- Improve the word lookup sheet with a bottom white card, large word, phonetic text, pronunciation button, definitions, example, and a primary add-to-vocab action.
- Keep the translation bubble but make it feel like a premium text-selection menu with translate/copy/underline/share actions.
- Reduce visual similarity to the reference by using our own image-led ambient background, softer color blending, and a compact sentence-level popover instead of a large reference-style overlay.
- Remove visible debug overlays and fix broken Chinese copy on Words and Me pages.
- Add a small static smoke check so the same defects do not return.

## Visual Direction

- Background: white reader surface blended with the article image color through a blurred ambient layer and warm/cool gradients.
- Typography: large serif English headline/body, system sans-serif for UI labels and Chinese supporting text.
- Color: black text, soft gray secondary text, restrained green accent, pale warm highlight for annotated words.
- Layout ratio: top story framing uses a generous editorial title block followed by a rounded image; body content uses wide line height and paragraph rhythm.
- Interaction: long-pressing a sentence opens a small, easily closable translation card above that sentence.

## Data And Backend Direction

This first pass keeps the current local storage vocabulary model. Later backend work should add a repository boundary so the same page logic can use either local storage or cloud database APIs.

Translation should be layered for low cost:

1. For curated articles, store human-edited paragraph/sentence translations with the article content. This gives the best quality and zero runtime API cost.
2. For unknown words, use the local dictionary first, then a cached dictionary API later if needed.
3. Use AI only on demand for premium actions such as "explain this sentence" or "generate study notes", and cache every result by article id + sentence hash.
4. Avoid sending every sentence to AI during reading; that would be expensive and slow.

## Acceptance Checks

- No red debug `1` overlay appears in source pages.
- Known broken copy is corrected.
- Reading page has white reader styling, serif reading typography, article metadata, toolbar, word sheet, and translation menu.
- The first article is marked as CET-6.
- Article image color is blended into the page background through an ambient image layer.
- Translation appears as an anchored compact popover above the pressed sentence.
- H5 build compiles far enough for browser preview or reports only environment-related issues.
