"use client"

import type React from "react"

import { useState, useRef, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Mic,
  Send,
  Paperclip,
  User,
  Bot,
  FileText,
  Volume2,
  VolumeX,
  MicOff,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Loader2,
  Sparkles,
} from "lucide-react"
import { FileUpload, type UploadedFile } from "./file-upload"
import { ChatSidebar } from "./chat-sidebar"
import { SearchHighlight } from "./search-highlight"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { useTextToSpeech } from "@/hooks/use-text-to-speech"
import { useChatHistory, type Message } from "@/hooks/use-chat-history"

export function ChatInterface() {
  const [inputValue, setInputValue] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<Message[]>([])
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const {
    sessions,
    currentSessionId,
    getCurrentSession,
    createNewSession,
    updateCurrentSession,
    switchToSession,
    renameSession,
    deleteSession,
    clearAllHistory,
  } = useChatHistory()

  const currentSession = getCurrentSession()
  const messages = useMemo(() => currentSession?.messages || [], [currentSession?.messages])

  const {
    isListening,
    transcript,
    isSupported: speechRecognitionSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition()

  const { speak, stop: stopSpeaking, isSpeaking, isSupported: textToSpeechSupported } = useTextToSpeech()

  useEffect(() => {
    if (searchQuery.trim()) {
      const results = messages.filter((message) => message.content.toLowerCase().includes(searchQuery.toLowerCase()))
      setSearchResults(results)
      setCurrentSearchIndex(0)
    } else {
      setSearchResults([])
      setCurrentSearchIndex(0)
    }
  }, [searchQuery, messages])

  const handleSearchToggle = () => {
    setIsSearchOpen(!isSearchOpen)
    if (!isSearchOpen) {
      setSearchQuery("")
      setSearchResults([])
      setCurrentSearchIndex(0)
    }
  }

  const scrollToMessage = (messageId: string) => {
    const messageElement = document.getElementById(`message-${messageId}`)
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }

  const handleSearchNavigation = (direction: "up" | "down") => {
    if (searchResults.length === 0) return

    let newIndex = currentSearchIndex
    if (direction === "up") {
      newIndex = currentSearchIndex > 0 ? currentSearchIndex - 1 : searchResults.length - 1
    } else {
      newIndex = currentSearchIndex < searchResults.length - 1 ? currentSearchIndex + 1 : 0
    }

    setCurrentSearchIndex(newIndex)
    scrollToMessage(searchResults[newIndex].id)
  }

  useEffect(() => {
    if (transcript) {
      setInputValue(transcript)
    }
  }, [transcript])

  const handleSendMessage = async () => {
    if (!inputValue.trim() && uploadedFiles.length === 0) return

    console.log("[Zyren] Starting to send message:", inputValue)
    console.log("[Zyren] Current messages before sending:", messages)

    const userMessage = inputValue || "Uploaded files for analysis"
    const newMessage: Message = {
      id: Date.now().toString(),
      content: userMessage,
      sender: "user",
      timestamp: new Date(),
      attachedFiles: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined,
    }

    const updatedMessages = [...messages, newMessage]
    console.log("[Zyren] Updated messages after adding user message:", updatedMessages)

    updateCurrentSession(updatedMessages)
    setInputValue("")
    resetTranscript()
    setIsLoading(true)

    // Clear uploaded files after sending
    const filesToSend = [...uploadedFiles]
    setUploadedFiles([])
    setIsFileDialogOpen(false)

    try {
      const processedFiles = await Promise.all(
        filesToSend.map(async (file) => {
          if (file.type.startsWith("image/")) {
            // Convert image to base64
            const response = await fetch(file.url)
            const blob = await response.blob()
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onloadend = () => {
                const result = reader.result as string
                // Remove data:image/jpeg;base64, prefix
                const base64Data = result.split(",")[1]
                resolve(base64Data)
              }
              reader.readAsDataURL(blob)
            })

            return {
              ...file,
              base64Data: base64,
              mimeType: file.type,
            }
          }
          return file
        }),
      )

      console.log("[Zyren] Sending request to API with:", {
        message: userMessage,
        files: processedFiles,
        conversationHistory: messages,
      })

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          files: processedFiles,
          conversationHistory: messages,
        }),
      })

      const data = await response.json()
      console.log("[Zyren] API response:", data)

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response")
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        sender: "ai",
        timestamp: new Date(),
      }

      const finalMessages = [...updatedMessages, aiResponse]
      console.log("[Zyren] Final messages after AI response:", finalMessages)

      updateCurrentSession(finalMessages)

      if (autoSpeak && textToSpeechSupported) {
        speak(data.response)
      }
    } catch (error) {
      console.error("[Zyren] Error getting AI response:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}. Please make sure your GEMINI_API_KEY environment variable is set correctly.`,
        sender: "ai",
        timestamp: new Date(),
      }

      const finalMessages = [...updatedMessages, errorMessage]
      updateCurrentSession(finalMessages)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const handleSpeechToggle = () => {
    if (isSpeaking) {
      stopSpeaking()
    } else {
      setAutoSpeak(!autoSpeak)
    }
  }

  const handleFilesUploaded = (newFiles: UploadedFile[]) => {
    setUploadedFiles((prev) => [...prev, ...newFiles])
  }

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      // Open file dialog and handle files
      setIsFileDialogOpen(true)
      // Convert files to UploadedFile format
      const uploadedFiles: UploadedFile[] = files.map((file) => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
        file: file,
      }))
      handleFilesUploaded(uploadedFiles)
    }
  }

  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        const scrollElement = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight
        }
      }
    }

    // Use setTimeout to ensure DOM is updated
    const timeoutId = setTimeout(scrollToBottom, 100)
    return () => clearTimeout(timeoutId)
  }, [messages.length])

  const handleNewChat = () => {
    console.log("[Zyren] Creating new chat session")
    createNewSession()
  }

  return (
    <div
      className="flex h-screen bg-background relative overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center backdrop-blur-sm">
          <div className="text-center">
            <Paperclip className="w-12 h-12 mx-auto text-primary mb-4 animate-bounce" />
            <p className="text-lg font-medium gradient-text">Drop files here to upload</p>
            <p className="text-sm text-muted-foreground">Supports PDF, Word, Excel, text, and images</p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <ChatSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={handleNewChat}
        onSwitchChat={switchToSession}
        onRenameChat={renameSession}
        onDeleteChat={deleteSession}
        onClearHistory={clearAllHistory}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <div className="glass-strong border-b border-border/30 p-4 holographic">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary via-secondary to-accent p-0.5 animate-pulse-glow">
                  <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                  </div>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-serif font-black gradient-text">Zyren</h1>
                <p className="text-sm text-muted-foreground">{currentSession?.title || "AI Chat Assistant"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSearchToggle}
                className={`glass transition-all duration-300 hover:neon-glow-cyan ${
                  isSearchOpen ? "neon-border-cyan bg-primary/20" : "bg-transparent border-border/50"
                }`}
              >
                <Search className="w-4 h-4" />
                <span className="ml-2 text-xs">Search</span>
              </Button>
              {textToSpeechSupported && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSpeechToggle}
                  className={`glass transition-all duration-300 hover:neon-glow-purple ${
                    autoSpeak ? "neon-border-purple bg-secondary/20" : "bg-transparent border-border/50"
                  }`}
                >
                  {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  <span className="ml-2 text-xs">{autoSpeak ? "Auto-speak ON" : "Auto-speak OFF"}</span>
                </Button>
              )}
            </div>
          </div>

          {isSearchOpen && (
            <div className="mt-4 flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
              <div className="flex-1 relative">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages..."
                  className="glass pr-20 border-border/50 focus:neon-border-cyan transition-all duration-300"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {searchResults.length > 0 && (
                    <>
                      <span className="text-xs text-muted-foreground">
                        {currentSearchIndex + 1}/{searchResults.length}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault()
                          handleSearchNavigation("up")
                        }}
                        className="h-6 w-6 text-muted-foreground hover:text-accent hover:neon-glow-green transition-all duration-200"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault()
                          handleSearchNavigation("down")
                        }}
                        className="h-6 w-6 text-muted-foreground hover:text-accent hover:neon-glow-green transition-all duration-200"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSearchToggle}
                className="text-muted-foreground hover:text-foreground hover:neon-glow-cyan transition-all duration-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 relative overflow-hidden">
          <ScrollArea className="h-full w-full" ref={scrollAreaRef}>
            <div className="p-4">
              <div className="space-y-4 max-w-4xl mx-auto pb-4">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-8 animate-in fade-in duration-500">
                    <div className="relative mb-4">
                      <Bot className="w-12 h-12 mx-auto opacity-50 animate-float" />
                      <div className="absolute inset-0 w-12 h-12 mx-auto rounded-full bg-primary/20 animate-ping"></div>
                    </div>
                    <p className="text-lg font-medium gradient-text">Start a conversation with Zyren!</p>
                    <p className="text-sm mt-2">Upload files, use voice input, or just type your message</p>
                  </div>
                )}
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    id={`message-${message.id}`}
                    className={`flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-300 mb-4 ${
                      message.sender === "user" ? "flex-row-reverse" : ""
                    } ${
                      searchResults.length > 0 && searchResults[currentSearchIndex]?.id === message.id
                        ? "ring-2 ring-accent/50 rounded-lg neon-glow-green"
                        : ""
                    }`}
                  >
                    <div
                      className={`glass rounded-full p-2 transition-all duration-300 ${
                        message.sender === "user"
                          ? "bg-primary/20 neon-glow-cyan border border-primary/30"
                          : "bg-secondary/20 neon-glow-purple border border-secondary/30"
                      }`}
                    >
                      {message.sender === "user" ? (
                        <User className="w-4 h-4 text-primary" />
                      ) : (
                        <Bot className="w-4 h-4 text-secondary" />
                      )}
                    </div>
                    <div className="max-w-[70%] space-y-2">
                      <Card
                        className={`glass p-4 transition-all duration-300 hover:neon-glow-cyan ${
                          message.sender === "user"
                            ? "bg-primary/10 border-primary/20 hover:bg-primary/15"
                            : "bg-card border-border hover:bg-card/80"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              <SearchHighlight text={message.content} searchQuery={searchQuery} />
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                          {message.sender === "ai" && textToSpeechSupported && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => speak(message.content)}
                              className="h-6 w-6 text-muted-foreground hover:text-accent hover:neon-glow-green transition-all duration-200"
                            >
                              <Volume2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </Card>

                      {message.attachedFiles && message.attachedFiles.length > 0 && (
                        <div className="space-y-1">
                          {message.attachedFiles.map((file) => (
                            <Card
                              key={file.id}
                              className="glass p-2 bg-muted/20 border-border/30 hover:neon-glow-green transition-all duration-200"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="w-3 h-3 text-accent" />
                                <span className="text-xs text-foreground">{file.name}</span>
                                {file.url && file.type.startsWith("image/") && (
                                  <img
                                    src={file.url || "/placeholder.svg"}
                                    alt={file.name}
                                    className="w-16 h-16 object-cover rounded ml-auto border border-border/30"
                                  />
                                )}
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className="glass-strong border-t border-border/30 p-4 holographic">
          <div className="max-w-4xl mx-auto flex items-center gap-2">
            <Dialog open={isFileDialogOpen} onOpenChange={setIsFileDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={`glass hover:neon-glow-green transition-all duration-300 bg-transparent border-border/50 ${
                    uploadedFiles.length > 0 ? "neon-border-green bg-accent/10" : ""
                  }`}
                >
                  <Paperclip className="w-4 h-4" />
                  {uploadedFiles.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center neon-glow-green">
                      {uploadedFiles.length}
                    </span>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-strong neon-border-cyan">
                <DialogHeader>
                  <DialogTitle className="gradient-text">Upload Files</DialogTitle>
                </DialogHeader>
                <FileUpload
                  onFilesUploaded={handleFilesUploaded}
                  uploadedFiles={uploadedFiles}
                  onRemoveFile={handleRemoveFile}
                />
              </DialogContent>
            </Dialog>

            <div className="flex-1 relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isListening ? "Listening..." : "Type your message or use voice input..."}
                className="glass pr-12 border-border/50 focus:neon-border-cyan transition-all duration-300"
                disabled={isLoading}
              />
              {speechRecognitionSupported && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`absolute right-1 top-1/2 -translate-y-1/2 transition-all duration-300 ${
                    isListening
                      ? "text-destructive bg-destructive/10 neon-glow-cyan"
                      : "text-muted-foreground hover:text-accent hover:neon-glow-green"
                  }`}
                  onClick={handleVoiceToggle}
                  disabled={isLoading}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              )}
            </div>

            <Button
              onClick={handleSendMessage}
              disabled={(!inputValue.trim() && uploadedFiles.length === 0) || isLoading}
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground transition-all duration-300 neon-glow-cyan"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>

          {(isListening || !speechRecognitionSupported || !textToSpeechSupported) && (
            <div className="max-w-4xl mx-auto mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              {isListening && (
                <div className="flex items-center gap-1 text-destructive animate-pulse">
                  <div className="w-2 h-2 bg-destructive rounded-full animate-pulse neon-glow-cyan" />
                  Recording...
                </div>
              )}
              {!speechRecognitionSupported && <span>Voice input not supported in this browser</span>}
              {!textToSpeechSupported && <span>Text-to-speech not supported in this browser</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
