/**
 * 文章解枔工具（主要功能）。
 */

export interface TextToken {
  type: 'word' | 'space' | 'punctuation'
  text: string
  normalized?: string
}

export function splitParagraphs(text: string): string[] {
  if (!text) return []
  return text
    .split(/\\n\\s*\\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export function splitSentences(text: string): string[] {
  if (!text) return []
  return text
    .split(/(?<=\.\s+|\?\s+|!\s+)/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function parseParagraph(text: string): TextToken[] {
  if (!text) return []
  const tokens: TextToken[] = []
  const regex = /([a-zA-Z]+(?:['-][a-zA-Z]+)*)|(\s+)|([^\sa-zA-Z]+)/g
  let match
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      // word
      const word = match[0]
      tokens.push({
        type: 'word',
        text: word,
        normalized: word.toLowerCase().replace(/[^a-z']/g, ''),
      })
    } else if (match[2]) {
      // whitespace
      tokens.push({ type: 'space', text: match[0] })
    } else if (match[3]) {
      // punctuation
      tokens.push({ type: 'punctuation', text: match[0] })
    }
  }
  return tokens
}
