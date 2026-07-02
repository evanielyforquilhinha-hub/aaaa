import type { TextToken } from '@/utils/wordParser'

export interface ReaderTheme {
  accent: string
  warm: string
  cool: string
  paper: string
  shadow: string
  warmSoft: string
  coolSoft: string
  visualStart: string
  visualEnd: string
  accentSoft: string
}

export interface Article {
  id: string
  title: string
  wordCount: number
  level: string
  visualSymbol: string
  visualCaption: string
  content: string
  source: string
  theme: ReaderTheme
}

export interface ReaderToken extends TextToken {
  emphasis?: boolean
}

export interface SentenceUnit {
  id: string
  blockId: string
  blockIndex: number
  index: number
  tokens: ReaderToken[]
  plainText: string
  translation: string
  translationNote: string
}

export interface ContentBlock {
  id: string
  index: number
  sentences: SentenceUnit[]
}
