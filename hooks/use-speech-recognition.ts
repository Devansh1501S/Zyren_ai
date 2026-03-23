"use client"

import { useState, useEffect, useRef } from "react"

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  addEventListener(type: "result", listener: (event: SpeechRecognitionEvent) => void): void
  addEventListener(type: "error", listener: (event: SpeechRecognitionErrorEvent) => void): void
  addEventListener(type: "start", listener: () => void): void
  addEventListener(type: "end", listener: () => void): void
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const retryCountRef = useRef(0)
  const MAX_RETRIES = 3

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        setIsSupported(true)
        const initRecognition = () => {
          const recognition = new SpeechRecognition()
          recognition.continuous = true
          recognition.interimResults = true
          recognition.lang = "en-US"

          recognition.addEventListener("result", (event: SpeechRecognitionEvent) => {
            let finalTranscript = ""
            let interimTranscript = ""

            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcriptChunk = event.results[i][0].transcript
              if (event.results[i].isFinal) {
                finalTranscript += transcriptChunk
              } else {
                interimTranscript += transcriptChunk
              }
            }

            if (finalTranscript) {
              setTranscript((prev) => (prev ? prev + " " + finalTranscript : finalTranscript))
            }
          })

          recognition.addEventListener("start", () => {
            setIsListening(true)
            setError(null)
            retryCountRef.current = 0
          })

          recognition.addEventListener("end", () => {
            setIsListening(false)
          })

          recognition.addEventListener("error", (event: SpeechRecognitionErrorEvent) => {
            // Log only if not a network error we are retrying
            if (event.error !== "network") {
              console.error("Speech recognition error:", event.error)
              setError(event.error)
            }
            
            setIsListening(false)

            // Handle network errors with a retry
            if (event.error === "network" && retryCountRef.current < MAX_RETRIES) {
              retryCountRef.current++
              console.log(`Retrying speech recognition (attempt ${retryCountRef.current})...`)
              
              // Use a slightly longer backoff for retries
              setTimeout(() => {
                if (recognitionRef.current && !isListening) {
                  try {
                    recognitionRef.current.start()
                  } catch (e) {
                    console.error("Failed to restart recognition:", e)
                  }
                }
              }, 1500 * retryCountRef.current)
            }
          })

          return recognition
        }

        recognitionRef.current = initRecognition()
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript("")
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }

  const resetTranscript = () => {
    setTranscript("")
  }

  return {
    isListening,
    transcript,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  }
}
