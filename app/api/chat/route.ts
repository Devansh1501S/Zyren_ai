import Groq from "groq-sdk"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { message, files, conversationHistory } = await request.json()

    console.log("[Zyren] API received request (Groq):", {
      message,
      files: files?.length || 0,
      historyLength: conversationHistory?.length || 0,
    })

    if (!process.env.GROQ_API_KEY) {
      console.log("[Zyren] Missing Groq API key")
      return NextResponse.json(
        { error: "Groq API key not configured. Please add GROQ_API_KEY to your environment variables." },
        { status: 500 },
      )
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })

    // Build chat history correctly for Groq
    const messages = (conversationHistory || [])
      .filter((msg: any) => msg.content && msg.content.trim() !== "")
      .map((msg: any) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content,
      }))

    // Add system message if not present
    if (messages.length === 0 || messages[0].role !== "system") {
      messages.unshift({
        role: "system",
        content: "You are Zyren, a helpful AI assistant. Provide concise and accurate responses.",
      })
    }

    // Ensure the last message is always from the user
    let enrichedMessage = message || "Uploaded files for analysis"
    if (files && files.length > 0) {
      const fileNames = files.map((f: any) => f.name).join(", ")
      enrichedMessage = `[User uploaded files: ${fileNames}]\n\n${enrichedMessage}`
    }

    messages.push({
      role: "user",
      content: enrichedMessage,
    })

    console.log("[Zyren] Calling Groq API with messages count:", messages.length)

    const completion = await groq.chat.completions.create({
      messages: messages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_completion_tokens: 1024,
      top_p: 1,
      stream: false,
    })

    const responseText = completion.choices[0]?.message?.content || ""

    console.log("[Zyren] Groq response received, length:", responseText.length)

    return NextResponse.json({ response: responseText })
  } catch (error: any) {
    console.error("[Zyren] Groq API error details:", {
      message: error.message,
      name: error.name,
      status: error?.status || error?.response?.status,
      body: error?.error || error?.response?.data,
    })
    
    let errorMessage = "Failed to generate response."
    if (error instanceof Error) {
      errorMessage = error.message
    }
    
    // Check for specific common errors
    if (error.status === 401) errorMessage = "Invalid Groq API Key. Please check your .env.local file."
    if (error.status === 404) errorMessage = "The selected Groq model was not found."
    if (error.status === 429) errorMessage = "Groq API rate limit exceeded. Please try again in a moment."

    return NextResponse.json(
      { error: errorMessage },
      { status: error.status || 500 },
    )
  }
}
