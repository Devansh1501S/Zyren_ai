import { GoogleGenerativeAI } from "@google/generative-ai"
import { type NextRequest, NextResponse } from "next/server"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function POST(request: NextRequest) {
  try {
    const { message, files, conversationHistory } = await request.json()

    console.log("[Zyren] API received request:", {
      message,
      files: files?.length || 0,
      historyLength: conversationHistory?.length || 0,
    })

    if (!process.env.GEMINI_API_KEY) {
      console.log("[Zyren] Missing Gemini API key")
      return NextResponse.json(
        { error: "Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables." },
        { status: 500 },
      )
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const contentParts: any[] = []

    // Add conversation history for context (last 10 messages)
    if (conversationHistory && conversationHistory.length > 0) {
      let contextText = "You are Zyren, a helpful AI assistant. Here's our conversation history:\n"
      const recentHistory = conversationHistory.slice(-10)
      for (const msg of recentHistory) {
        contextText += `${msg.sender === "user" ? "User" : "Zyren"}: ${msg.content}\n`
      }
      contextText += "\n"
      contentParts.push({ text: contextText })
    } else {
      contentParts.push({ text: "You are Zyren, a helpful AI assistant. " })
    }

    // Handle file analysis with proper image support
    if (files && files.length > 0) {
      let fileText = "The user has uploaded the following files:\n"

      for (const file of files) {
        if (file.base64Data && file.mimeType && file.mimeType.startsWith("image/")) {
          // Add image to content parts for vision analysis
          contentParts.push({
            inlineData: {
              data: file.base64Data,
              mimeType: file.mimeType,
            },
          })
          fileText += `- ${file.name} (${file.type}) - Image uploaded for analysis\n`
        } else if (file.content) {
          fileText += `- ${file.name} (${file.type}):\n${file.content}\n`
        } else {
          fileText += `- ${file.name} (${file.type})\n`
        }
      }

      fileText +=
        "\nPlease analyze these files and respond to the user's message in context of the uploaded content.\n\n"
      contentParts.push({ text: fileText })
    }

    contentParts.push({ text: `User: ${message}\n\nZyren:` })

    console.log("[Zyren] Content parts prepared:", contentParts.length, "parts")

    const result = await model.generateContent(contentParts)
    const response = await result.response
    const text = response.text()

    console.log("[Zyren] Gemini response received, length:", text.length)

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error("[Zyren] Gemini API error:", error)
    return NextResponse.json(
      {
        error: `Failed to generate response: ${error instanceof Error ? error.message : "Unknown error"}. Please check your API key and try again.`,
      },
      { status: 500 },
    )
  }
}
