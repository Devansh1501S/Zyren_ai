"use client"

import { useState, useEffect } from "react"
import type { UploadedFile } from "@/components/file-upload"

export interface Message {
  id: string
  content: string
  sender: "user" | "ai"
  timestamp: Date
  attachedFiles?: UploadedFile[]
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

const STORAGE_KEY = "zyren-chat-history"
const CURRENT_SESSION_KEY = "zyren-current-session" // Added key for persisting current session

const generateChatTitle = async (messages: Message[]): Promise<string> => {
  const userMessages = messages.filter((m) => m.sender === "user")
  if (userMessages.length === 0) return "New Chat"

  const firstMessage = userMessages[0].content
  if (firstMessage.length <= 30) return firstMessage

  // For longer messages, try to generate a smart title
  try {
    const response = await fetch("/api/generate-title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: firstMessage }),
    })

    if (response.ok) {
      const { title } = await response.json()
      return title || firstMessage.slice(0, 30) + "..."
    }
  } catch (error) {
    console.error("Failed to generate title:", error)
  }

  return firstMessage.slice(0, 30) + "..."
}

export function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  useEffect(() => {
    const storedCurrentSession = localStorage.getItem(CURRENT_SESSION_KEY)
    if (storedCurrentSession) {
      setCurrentSessionId(storedCurrentSession)
    }
  }, [])

  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem(CURRENT_SESSION_KEY, currentSessionId)
    }
  }, [currentSessionId])

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        const sessionsWithDates = parsed.map((session: any) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        }))
        setSessions(sessionsWithDates)

        const storedCurrentSession = localStorage.getItem(CURRENT_SESSION_KEY)
        if (sessionsWithDates.length > 0 && !currentSessionId && !storedCurrentSession) {
          setCurrentSessionId(sessionsWithDates[0].id)
        }
      } catch (error) {
        console.error("Failed to load chat history:", error)
      }
    }
  }, []) // Removed currentSessionId from dependencies to prevent infinite loop

  // Save sessions to localStorage whenever sessions change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
    }
  }, [sessions])

  const createNewSession = (title?: string): string => {
    const newSession: ChatSession = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: title || "New Chat",
      messages: [
        {
          id: "welcome",
          content:
            "Hello! I'm Zyren, your AI assistant. How can I help you today? You can also upload files for me to analyze and discuss, or use voice input to talk to me.",
          sender: "ai",
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    setSessions((prev) => [newSession, ...prev])
    setCurrentSessionId(newSession.id)
    return newSession.id
  }

  const getCurrentSession = (): ChatSession | null => {
    return sessions.find((session) => session.id === currentSessionId) || null
  }

  const updateCurrentSession = async (messages: Message[]) => {
    if (!currentSessionId) return

    setSessions((prev) =>
      prev.map((session) =>
        session.id === currentSessionId
          ? {
              ...session,
              messages,
              updatedAt: new Date(),
            }
          : session,
      ),
    )

    const userMessages = messages.filter((m) => m.sender === "user")
    if (userMessages.length === 1) {
      const currentSession = sessions.find((s) => s.id === currentSessionId)
      if (currentSession && currentSession.title === "New Chat") {
        const newTitle = await generateChatTitle(messages)
        setSessions((prev) =>
          prev.map((session) => (session.id === currentSessionId ? { ...session, title: newTitle } : session)),
        )
      }
    }
  }

  const switchToSession = (sessionId: string) => {
    setCurrentSessionId(sessionId)
  }

  const renameSession = (sessionId: string, newTitle: string) => {
    setSessions((prev) => prev.map((session) => (session.id === sessionId ? { ...session, title: newTitle } : session)))
  }

  const deleteSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((session) => session.id !== sessionId))

    // If we deleted the current session, switch to another one or create new
    if (sessionId === currentSessionId) {
      const remainingSessions = sessions.filter((session) => session.id !== sessionId)
      if (remainingSessions.length > 0) {
        setCurrentSessionId(remainingSessions[0].id)
      } else {
        localStorage.removeItem(CURRENT_SESSION_KEY)
        createNewSession()
      }
    }
  }

  const clearAllHistory = () => {
    setSessions([])
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(CURRENT_SESSION_KEY)
    createNewSession()
  }

  // Create initial session if none exist
  useEffect(() => {
    if (sessions.length === 0 && !currentSessionId) {
      createNewSession()
    }
  }, [sessions.length, currentSessionId])

  return {
    sessions,
    currentSessionId,
    getCurrentSession,
    createNewSession,
    updateCurrentSession,
    switchToSession,
    renameSession,
    deleteSession,
    clearAllHistory,
  }
}
