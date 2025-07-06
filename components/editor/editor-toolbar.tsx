"use client"

import * as React from "react"
import {
  Pilcrow,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Code,
  Quote,
  FileCode,
  Type,
  Eye,
  FileText,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useNotesStore } from "@/lib/store"

interface EditorToolbarProps {
  editor: any // Draft.js editor instance
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const { viewMode, setViewMode } = useNotesStore()

  return (
    <div className="flex items-center gap-1 p-2 bg-gray-50 rounded-lg border border-gray-200">
      {/* View mode toggle */}
      <div className="flex items-center bg-white rounded border border-gray-200">
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 px-3 rounded-r-none border-r ${
            viewMode === 'rendered' ? 'bg-blue-100 text-blue-700' : ''
          }`}
          title="Rendered View"
          onClick={() => setViewMode('rendered')}
        >
          <Eye className="h-4 w-4 mr-1" />
          <span className="text-xs">Rendered</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 px-3 rounded-l-none ${
            viewMode === 'source' ? 'bg-blue-100 text-blue-700' : ''
          }`}
          title="Source View"
          onClick={() => setViewMode('source')}
        >
          <FileText className="h-4 w-4 mr-1" />
          <span className="text-xs">Source</span>
        </Button>
      </div>

    </div>
  )
}