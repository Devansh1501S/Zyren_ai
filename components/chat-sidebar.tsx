"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, MessageSquare, MoreVertical, Edit2, Trash2, X, Menu, History } from "lucide-react"
import type { ChatSession } from "@/hooks/use-chat-history"

interface ChatSidebarProps {
  sessions: ChatSession[]
  currentSessionId: string | null
  onNewChat: () => void
  onSwitchChat: (sessionId: string) => void
  onRenameChat: (sessionId: string, newTitle: string) => void
  onDeleteChat: (sessionId: string) => void
  onClearHistory: () => void
}

export function ChatSidebar({
  sessions,
  currentSessionId,
  onNewChat,
  onSwitchChat,
  onRenameChat,
  onDeleteChat,
  onClearHistory,
}: ChatSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false)

  const handleRename = (sessionId: string, currentTitle: string) => {
    setEditingSessionId(sessionId)
    setEditTitle(currentTitle)
  }

  const handleSaveRename = () => {
    if (editingSessionId && editTitle.trim()) {
      onRenameChat(editingSessionId, editTitle.trim())
    }
    setEditingSessionId(null)
    setEditTitle("")
  }

  const handleCancelRename = () => {
    setEditingSessionId(null)
    setEditTitle("")
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  if (isCollapsed) {
    return (
      <div className="glass-strong border-r border-border/30 w-16 flex flex-col items-center py-4 gap-4 holographic">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="text-muted-foreground hover:text-foreground hover:neon-glow-cyan transition-all duration-300"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewChat}
          className="text-muted-foreground hover:text-accent hover:neon-glow-green transition-all duration-300"
        >
          <Plus className="w-5 h-5" />
        </Button>
        <div className="flex-1 flex flex-col gap-2 overflow-hidden">
          {sessions.slice(0, 8).map((session) => (
            <Button
              key={session.id}
              variant="ghost"
              size="icon"
              onClick={() => onSwitchChat(session.id)}
              className={`text-muted-foreground hover:text-foreground transition-all duration-300 ${
                session.id === currentSessionId ? "bg-primary/10 text-primary neon-glow-cyan" : "hover:neon-glow-purple"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="glass-strong border-r border-border/30 w-80 flex flex-col holographic">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <History className="w-5 h-5 text-primary animate-pulse" />
              <div className="absolute inset-0 w-5 h-5 bg-primary/20 rounded-full animate-ping"></div>
            </div>
            <h2 className="font-serif font-semibold gradient-text">Chat History</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            className="text-muted-foreground hover:text-foreground hover:neon-glow-cyan transition-all duration-300"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <Button
          onClick={onNewChat}
          className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground transition-all duration-300 neon-glow-cyan"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`glass rounded-lg p-3 cursor-pointer transition-all duration-300 group ${
                session.id === currentSessionId
                  ? "bg-primary/10 border-primary/20 neon-glow-cyan"
                  : "hover:bg-accent/5 border-transparent hover:neon-glow-purple"
              }`}
              onClick={() => onSwitchChat(session.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  {editingSessionId === session.id ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") handleSaveRename()
                          if (e.key === "Escape") handleCancelRename()
                        }}
                        onBlur={handleSaveRename}
                        className="h-6 text-xs glass border-border/50 focus:neon-border-cyan"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-foreground truncate">{session.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(session.updatedAt)}</p>
                    </>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:neon-glow-green"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass-strong neon-border-cyan">
                    <DropdownMenuItem
                      onClick={() => handleRename(session.id, session.title)}
                      className="hover:bg-accent/10 transition-colors duration-200"
                    >
                      <Edit2 className="w-3 h-3 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDeleteChat(session.id)}
                      className="text-destructive focus:text-destructive hover:bg-destructive/10 transition-colors duration-200"
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border/50">
        <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full glass text-muted-foreground bg-transparent border-border/50 hover:neon-glow-cyan transition-all duration-300"
            >
              <Trash2 className="w-3 h-3 mr-2" />
              Clear All History
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-strong neon-border-cyan">
            <DialogHeader>
              <DialogTitle className="gradient-text">Clear All Chat History</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will permanently delete all your chat sessions. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsClearDialogOpen(false)}
                  className="glass border-border/50 hover:neon-glow-green transition-all duration-300"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onClearHistory()
                    setIsClearDialogOpen(false)
                  }}
                  className="bg-destructive hover:bg-destructive/90 neon-glow-cyan transition-all duration-300"
                >
                  Clear All
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
