'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Loader2, Check, X } from 'lucide-react'

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'success' | 'error'

interface VoiceInputProps {
  listId?: string // Optional: target a specific list
}

export function VoiceInput({ listId }: VoiceInputProps) {
  const [state, setState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isSupported, setIsSupported] = useState(true)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Check if browser supports Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setIsSupported(false)
      return
    }

    // Initialize speech recognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false // Stop after one result
    recognition.interimResults = false // Only final results
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      console.log('[Voice] Started listening')
      setState('listening')
      setTranscript('')
      setFeedback('Listening...')

      // Auto-stop after 10 seconds if no result
      timeoutRef.current = setTimeout(() => {
        console.log('[Voice] Timeout - stopping')
        if (recognitionRef.current) {
          recognitionRef.current.stop()
        }
      }, 10000)
    }

    recognition.onresult = async (event) => {
      const result = event.results[0][0].transcript
      console.log('[Voice] Heard:', result)

      // Clear timeout since we got a result
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      setTranscript(result)
      setState('processing')
      setFeedback('Processing...')

      try {
        // Send to API for processing
        const response = await fetch('/api/voice-command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: result,
            listId: listId,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to process command')
        }

        // Success!
        setState('success')
        setFeedback(data.message || 'Done!')

        // Dispatch event to trigger dashboard refresh
        window.dispatchEvent(new CustomEvent('voice-command-success'))

        // Reset after 3 seconds
        setTimeout(() => {
          setState('idle')
          setTranscript('')
          setFeedback('')
        }, 3000)

      } catch (error) {
        setState('error')
        setFeedback(error instanceof Error ? error.message : 'Something went wrong')

        // Reset after 5 seconds
        setTimeout(() => {
          setState('idle')
          setTranscript('')
          setFeedback('')
        }, 5000)
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)

      // Ignore "aborted" errors (happens when user stops manually or component unmounts)
      if (event.error === 'aborted') {
        setState('idle')
        setFeedback('')
        return
      }

      let errorMessage = 'Voice recognition failed'
      if (event.error === 'no-speech') {
        errorMessage = "I didn't hear anything"
      } else if (event.error === 'not-allowed') {
        errorMessage = 'Microphone access denied'
      }

      setState('error')
      setFeedback(errorMessage)

      setTimeout(() => {
        setState('idle')
        setFeedback('')
      }, 3000)
    }

    recognition.onend = () => {
      console.log('[Voice] Recognition ended')

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      // Always reset to idle if still in listening state
      // (if we got a result, state will already be 'processing')
      setState(current => {
        if (current === 'listening') {
          setFeedback('')
          return 'idle'
        }
        return current
      })
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [listId])

  const startListening = () => {
    if (recognitionRef.current && state === 'idle') {
      try {
        recognitionRef.current.start()
      } catch (error) {
        console.error('Failed to start recognition:', error)
      }
    }
  }

  const stopListening = () => {
    console.log('[Voice] Stop requested')

    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        console.error('[Voice] Error stopping:', error)
        // Force reset if stop fails
        setState('idle')
        setFeedback('')
      }
    }
  }

  if (!isSupported) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-sm">
        Voice input not supported in this browser
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
      {/* Feedback Text */}
      {feedback && (
        <div
          className={`px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${
            state === 'success'
              ? 'bg-green-100 text-green-800'
              : state === 'error'
              ? 'bg-red-100 text-red-800'
              : 'bg-white text-gray-900'
          }`}
        >
          {feedback}
        </div>
      )}

      {/* Transcript Display */}
      {transcript && (
        <div className="bg-white px-4 py-2 rounded-lg shadow-lg text-sm text-gray-700 max-w-xs text-center">
          "{transcript}"
        </div>
      )}

      {/* Main Voice Button */}
      <Button
        onClick={state === 'listening' ? stopListening : startListening}
        disabled={state === 'processing'}
        size="lg"
        className={`h-16 w-16 rounded-full shadow-2xl transition-all ${
          state === 'listening'
            ? 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse'
            : state === 'processing'
            ? 'bg-blue-500'
            : state === 'success'
            ? 'bg-green-500'
            : state === 'error'
            ? 'bg-red-500'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {state === 'listening' ? (
          <MicOff className="h-6 w-6" />
        ) : state === 'processing' ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : state === 'success' ? (
          <Check className="h-6 w-6" />
        ) : state === 'error' ? (
          <X className="h-6 w-6" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </Button>

      {/* Hint Text */}
      {state === 'idle' && (
        <p className="text-xs text-gray-500 text-center max-w-xs">
          Tap to speak commands like "add milk" or "check off eggs"
        </p>
      )}
    </div>
  )
}
