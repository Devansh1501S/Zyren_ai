import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    const prompt = `Generate a short, descriptive title (maximum 4-5 words) for a chat conversation that starts with this message: "${message}". The title should capture the main topic or intent. Only return the title, nothing else.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const title = response.text().trim()

    return NextResponse.json({ title })
  } catch (error) {
    console.error("Error generating title:", error)
    return NextResponse.json({ error: "Failed to generate title" }, { status: 500 })
  }
}
