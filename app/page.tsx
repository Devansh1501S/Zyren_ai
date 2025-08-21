import { ChatInterface } from "@/components/chat-interface"

export default function Home() {
  return (
    <div className="min-h-screen">
      <ChatInterface />

      {/* Environment Variable Setup Notice */}
      {!process.env.GEMINI_API_KEY && (
        <div className="fixed bottom-4 right-4 max-w-sm">
          <div className="glass-strong p-4 rounded-lg border border-destructive/20 bg-destructive/5">
            <h3 className="font-semibold text-destructive mb-2">Setup Required</h3>
            <p className="text-sm text-muted-foreground">
              Add your <code className="bg-muted px-1 rounded">GEMINI_API_KEY</code> environment variable to enable AI
              responses.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
