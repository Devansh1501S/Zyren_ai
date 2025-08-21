"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, FileText, ImageIcon, FileSpreadsheet, File, FileVideo, FileAudio, FileCode, Archive } from "lucide-react"

export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  content?: string
  url?: string
}

interface FileUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void
  uploadedFiles: UploadedFile[]
  onRemoveFile: (fileId: string) => void
}

export function FileUpload({ onFilesUploaded, uploadedFiles, onRemoveFile }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const getFileIcon = (type: string, fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase() || ""

    if (type.startsWith("image/")) return <ImageIcon className="w-4 h-4" />
    if (type.startsWith("video/")) return <FileVideo className="w-4 h-4" />
    if (type.startsWith("audio/")) return <FileAudio className="w-4 h-4" />
    if (type.includes("spreadsheet") || type.includes("excel") || ["xls", "xlsx", "csv"].includes(extension))
      return <FileSpreadsheet className="w-4 h-4" />
    if (
      type.includes("text") ||
      type.includes("pdf") ||
      type.includes("document") ||
      ["txt", "md", "rtf", "doc", "docx", "pdf"].includes(extension)
    )
      return <FileText className="w-4 h-4" />
    if (
      [
        "js",
        "ts",
        "jsx",
        "tsx",
        "html",
        "css",
        "json",
        "xml",
        "py",
        "java",
        "cpp",
        "c",
        "php",
        "rb",
        "go",
        "rs",
        "swift",
      ].includes(extension)
    )
      return <FileCode className="w-4 h-4" />
    if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) return <Archive className="w-4 h-4" />
    return <File className="w-4 h-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const processFile = async (file: File): Promise<UploadedFile> => {
    const uploadedFile: UploadedFile = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream", // Default type for unknown files
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || ""

    try {
      // Handle different file types
      if (file.type.startsWith("image/")) {
        uploadedFile.url = URL.createObjectURL(file)
        uploadedFile.content = `Image file: ${file.name} - Ready for analysis and discussion`
      } else if (file.type === "text/plain" || ["txt", "md", "csv", "log"].includes(extension)) {
        uploadedFile.content = await file.text()
      } else if (file.type === "application/json" || extension === "json") {
        const jsonContent = await file.text()
        uploadedFile.content = `JSON file content:\n${jsonContent}`
      } else if (
        [
          "js",
          "ts",
          "jsx",
          "tsx",
          "html",
          "css",
          "xml",
          "py",
          "java",
          "cpp",
          "c",
          "php",
          "rb",
          "go",
          "rs",
          "swift",
        ].includes(extension)
      ) {
        const codeContent = await file.text()
        uploadedFile.content = `Code file (${extension.toUpperCase()}):\n${codeContent}`
      } else if (file.type === "application/pdf" || extension === "pdf") {
        uploadedFile.content = `PDF document: ${file.name} (${formatFileSize(file.size)}) - Ready for content analysis and discussion`
      } else if (
        file.type.includes("spreadsheet") ||
        file.type.includes("excel") ||
        ["xls", "xlsx"].includes(extension)
      ) {
        uploadedFile.content = `Spreadsheet: ${file.name} (${formatFileSize(file.size)}) - Ready for data analysis and discussion`
      } else if (
        file.type.includes("document") ||
        file.type.includes("word") ||
        ["doc", "docx", "rtf"].includes(extension)
      ) {
        uploadedFile.content = `Document: ${file.name} (${formatFileSize(file.size)}) - Ready for content analysis and discussion`
      } else if (file.type.startsWith("video/")) {
        uploadedFile.url = URL.createObjectURL(file)
        uploadedFile.content = `Video file: ${file.name} (${formatFileSize(file.size)}) - Ready for discussion about video content`
      } else if (file.type.startsWith("audio/")) {
        uploadedFile.url = URL.createObjectURL(file)
        uploadedFile.content = `Audio file: ${file.name} (${formatFileSize(file.size)}) - Ready for discussion about audio content`
      } else if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) {
        uploadedFile.content = `Archive file: ${file.name} (${formatFileSize(file.size)}) - Contains compressed files ready for discussion`
      } else {
        // Handle any other file type
        uploadedFile.content = `File: ${file.name} (${formatFileSize(file.size)}, Type: ${file.type || "Unknown"}) - Ready for analysis and discussion`
      }
    } catch (error) {
      console.error("Error processing file:", error)
      uploadedFile.content = `File: ${file.name} (${formatFileSize(file.size)}) - File uploaded successfully, ready for discussion`
    }

    return uploadedFile
  }

  const handleFiles = async (files: FileList) => {
    const fileArray = Array.from(files)
    const processedFiles = await Promise.all(fileArray.map(processFile))
    onFilesUploaded(processedFiles)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  return (
    <div className="space-y-4">
      {/* Drag & Drop Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`glass rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
      >
        <div className="space-y-2">
          <FileText className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-foreground">
            Drag & drop files here, or{" "}
            <label className="text-primary hover:text-primary/80 cursor-pointer underline">
              browse
              <input type="file" multiple onChange={handleFileInput} className="hidden" />
            </label>
          </p>
          <p className="text-xs text-muted-foreground">
            Supports all file types - documents, images, videos, audio, code, archives, and more
          </p>
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Uploaded Files</h4>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <Card key={file.id} className="glass p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getFileIcon(file.type, file.name)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveFile(file.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
