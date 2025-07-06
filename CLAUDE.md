# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
pnpm dev                  # Start development server with Turbopack
pnpm build               # Build production application with Turbopack  
pnpm start               # Start production server
pnpm lint                # Run ESLint checks
```

## Architecture Overview

This is a client-side note-taking application built with Next.js 15 and React 19. The app provides a hierarchical page/folder structure with a rich text editor for content creation.

### Core Architecture

- **State Management**: Zustand store (`lib/store.ts`) manages all application state including workspace data, pages, and sync status
- **Data Persistence**: LocalForage-based storage service (`lib/storage.ts`) provides offline data persistence with workspace and page management
- **UI Framework**: Built with shadcn/ui components and Tailwind CSS for consistent design
- **Rich Text Editing**: TipTap editor with custom extensions for markdown-like editing experience

### Key Components

- `components/note-taking-app.tsx` - Main application container with sidebar navigation and editor layout
- `components/editor/rich-text-editor.tsx` - TipTap-based rich text editor with custom commands
- `components/editor/editor-toolbar.tsx` - Formatting toolbar for text editing
- `components/sidebar/page-context-menu.tsx` - Context menu for page operations (rename, delete, create)

### Data Flow

1. **Zustand Store** (`lib/store.ts`) - Central state management with persistent storage
2. **Storage Service** (`lib/storage.ts`) - Handles LocalForage operations for offline persistence  
3. **Type Definitions** (`lib/types.ts`) - TypeScript interfaces for Page, Workspace, and AppState

### Feature Set

- Hierarchical page organization with folders
- Drag-and-drop page reordering and folder management
- Real-time auto-save with 2-second delay
- Rich text editing with markdown-style formatting
- Export pages to markdown files
- Context menus for page management
- Offline-first architecture with local storage

### Key Dependencies

- **@dnd-kit**: Drag and drop functionality for page reordering
- **@tiptap**: Rich text editor with extensible formatting
- **zustand**: Lightweight state management with persistence
- **localforage**: Improved localStorage with IndexedDB fallback
- **@radix-ui**: Headless UI components via shadcn/ui

### Development Notes

- The app uses manual Zustand hydration with `skipHydration: true` for SSR compatibility
- TypeScript errors and ESLint issues are ignored during builds (`ignoreDuringBuilds: true`)
- All images are unoptimized (`images: { unoptimized: true }`)
- Uses absolute imports with `@/*` path mapping