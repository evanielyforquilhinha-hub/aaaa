/**
 * Audio playback helpers for cached article and word audio.
 */

type SpeechLang = 'en_US' | 'zh_CN'

interface SpeakOptions {
  lang?: SpeechLang
  onStart?: () => void
  onEnd?: () => void
  onError?: (err: unknown) => void
}

let innerAudio: UniApp.InnerAudioContext | null = null
let stopped = false
let simulateTimer: ReturnType<typeof setTimeout> | null = null

function clearSimulate() {
  if (simulateTimer) {
    clearTimeout(simulateTimer)
    simulateTimer = null
  }
}

function stopAudio() {
  const audio = innerAudio
  if (audio) {
    try {
      audio.stop()
      audio.destroy()
    } catch {
      /* ignore */
    }
    innerAudio = null
  }
}

function destroyCurrentAudio(audio: UniApp.InnerAudioContext) {
  if (innerAudio !== audio) return
  try {
    audio.destroy()
  } catch {
    /* ignore */
  }
  innerAudio = null
}

export function stopSpeech(): void {
  stopped = true
  clearSimulate()
  stopAudio()
}

function estimateDurationMs(text: string, lang: SpeechLang): number {
  const perChar = lang === 'en_US' ? 55 : 120
  const base = lang === 'en_US' ? 400 : 300
  return Math.min(12000, Math.max(base, text.length * perChar))
}

function speakTextFallback(
  text: string,
  lang: SpeechLang,
  options: SpeakOptions,
): Promise<void> {
  return new Promise((resolve) => {
    if (stopped) {
      resolve()
      return
    }
    options.onStart?.()
    const duration = estimateDurationMs(text, lang)
    simulateTimer = setTimeout(() => {
      simulateTimer = null
      if (!stopped) {
        options.onEnd?.()
      }
      resolve()
    }, duration)
  })
}

export function playAudioUrl(url: string, options: SpeakOptions = {}): Promise<void> {
  const source = url.trim()
  if (!source) {
    const err = new Error('Missing audio URL')
    options.onError?.(err)
    return Promise.reject(err)
  }

  stopped = false
  clearSimulate()
  stopAudio()

  return new Promise((resolve, reject) => {
    let settled = false
    const audio = uni.createInnerAudioContext()
    innerAudio = audio
    audio.src = source

    const finish = () => {
      if (settled) return
      settled = true
      options.onEnd?.()
      destroyCurrentAudio(audio)
      resolve()
    }

    const fail = (err: unknown) => {
      if (settled) return
      settled = true
      options.onError?.(err)
      destroyCurrentAudio(audio)
      reject(err)
    }

    audio.onPlay(() => {
      if (!stopped) {
        options.onStart?.()
      }
    })
    audio.onEnded(finish)
    audio.onError(fail)

    try {
      audio.play()
    } catch (err) {
      fail(err)
    }
  })
}

export function speakText(text: string, options: SpeakOptions = {}): Promise<void> {
  const lang = options.lang ?? 'en_US'
  const trimmed = text.trim()
  if (!trimmed) {
    return Promise.resolve()
  }
  stopped = false
  clearSimulate()
  return speakTextFallback(trimmed, lang, options).catch((err) => {
    options.onError?.(err)
    throw err
  })
}

export function speakWord(word: string, options?: SpeakOptions): Promise<void> {
  return speakText(word, { ...options, lang: 'en_US' })
}

export async function speakSentences(
  sentences: string[],
  hooks: {
    onSentenceStart?: (index: number, sentence: string) => void
    onSentenceEnd?: (index: number) => void
    onAllEnd?: () => void
    onError?: (err: unknown) => void
  } = {},
): Promise<void> {
  stopped = false

  for (let i = 0; i < sentences.length; i++) {
    if (stopped) {
      break
    }
    const sentence = sentences[i]
    hooks.onSentenceStart?.(i, sentence)

    try {
      await speakText(sentence, {
        lang: 'en_US',
        onError: hooks.onError,
      })
    } catch (err) {
      hooks.onError?.(err)
      break
    }

    if (stopped) {
      break
    }
    hooks.onSentenceEnd?.(i)
  }

  hooks.onAllEnd?.()
}

export async function speakSentencesByAudioUrls(
  items: Array<{ audioUrl: string; sentence?: string }>,
  hooks: {
    onSentenceStart?: (index: number, sentence?: string) => void
    onSentenceEnd?: (index: number) => void
    onAllEnd?: () => void
    onError?: (err: unknown) => void
  } = {},
): Promise<void> {
  stopped = false

  for (let i = 0; i < items.length; i++) {
    if (stopped) {
      break
    }
    const item = items[i]

    try {
      await playAudioUrl(item.audioUrl, {
        onStart: () => hooks.onSentenceStart?.(i, item.sentence),
        onEnd: () => hooks.onSentenceEnd?.(i),
        onError: hooks.onError,
      })
    } catch {
      break
    }
  }

  hooks.onAllEnd?.()
}
