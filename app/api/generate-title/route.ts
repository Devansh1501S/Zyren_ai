import { type NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "Groq API key not configured" }, { status: 500 })
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })

    const prompt = `Generate a short, descriptive title (maximum 4-5 words) for a chat conversation that starts with this message: "${message}". The title should capture the main topic or intent. Only return the title, nothing else.`

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
    })

    const title = completion.choices[0]?.message?.content?.trim() || "New Chat"

    return NextResponse.json({ title })
  } catch (error) {
    console.error("Error generating title:", error)
    return NextResponse.json({ error: "Failed to generate title" }, { status: 500 })
  }
}
