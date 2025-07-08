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

This is a client-side note-taking application built with Next.js 15 and React 19. The app provides a hierarchical page/folder structure with rich text editing capabilities and AI chat integration.

### Core Architecture

- **State Management**: Zustand store (`lib/store.ts`) manages all application state including workspace data, pages, sync status, WebDAV config, and AI config
- **Data Persistence**: LocalForage-based storage service (`lib/storage.ts`) provides offline data persistence with workspace and page management
- **UI Framework**: Built with shadcn/ui components and Tailwind CSS for consistent design
- **Rich Text Editing**: Dual editor system with WangEditor (`components/editor/wang-editor.tsx`) and Draft.js (`components/editor/rich-text-editor.tsx`)
- **AI Integration**: AI service (`lib/ai-service.ts`) provides chat functionality with configurable API endpoints
- **Synchronization**: WebDAV service (`lib/webdav.ts`) enables cloud sync capabilities

### Key Components

- `components/note-taking-app.tsx` - Main application container with sidebar navigation, editor layout, and AI chat panel
- `components/editor/wang-editor.tsx` - WangEditor-based rich text editor with toolbar
- `components/editor/rich-text-editor.tsx` - Draft.js-based editor with markdown support
- `components/ai/ai-chat.tsx` - AI chat interface component
- `components/sidebar/page-context-menu.tsx` - Context menu for page operations (rename, delete, create)
- `components/settings/` - Settings components for WebDAV and AI configuration

### Data Flow

1. **Zustand Store** (`lib/store.ts`) - Central state management with persistent storage, WebDAV sync, and AI configuration
2. **Storage Service** (`lib/storage.ts`) - Handles LocalForage operations for offline persistence with import/export capabilities
3. **Type Definitions** (`lib/types.ts`) - TypeScript interfaces for Page, Workspace, AppState, WebDAVConfig, and AIConfig
4. **WebDAV Service** (`lib/webdav.ts`) - Handles cloud synchronization with WebDAV servers
5. **AI Service** (`lib/ai-service.ts`) - Manages AI API communications for chat functionality

### Feature Set

- Hierarchical page organization with folders and drag-and-drop reordering
- Rich text editing with multiple editor options (WangEditor and Draft.js)
- AI chat assistant with configurable API endpoints
- WebDAV synchronization for cloud backup and sync
- Offline-first architecture with local storage
- Real-time auto-save functionality
- Context menus for page management operations
- Export/import data functionality
- Theme switching support

### Key Dependencies

- **@dnd-kit**: Drag and drop functionality for page reordering
- **@wangeditor/editor**: Primary rich text editor with extensive formatting options
- **draft-js**: Alternative editor for markdown-style editing
- **zustand**: Lightweight state management with persistence
- **localforage**: Improved localStorage with IndexedDB fallback
- **@radix-ui**: Headless UI components via shadcn/ui
- **@prisma/client**: Database ORM (configured but not actively used)

### Development Notes

- The app uses manual Zustand hydration with `skipHydration: true` for SSR compatibility
- TypeScript errors and ESLint issues are ignored during builds (`ignoreDuringBuilds: true`)
- All images are unoptimized (`images: { unoptimized: true }`)
- Uses absolute imports with `@/*` path mapping
- WebPack configuration includes fallbacks for Node.js modules and special handling for WangEditor
- Both pnpm and npm are supported, but pnpm is preferred for package management