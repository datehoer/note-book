"use client"

import * as React from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Cloud,
  Download,
  Plus,
  Settings,
  Bot,
  Upload,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ClientDate } from "@/components/ui/client-date"
import { useNotesStore } from "@/lib/store"
import { WangEditorWrapper } from "@/components/editor/wang-editor-wrapper"
import { EditorToolbar } from "@/components/editor/editor-toolbar"
import { PageContextMenu } from "@/components/sidebar/page-context-menu"
import { WebDAVSettings } from "@/components/settings/webdav-settings"
import { AISettings } from "@/components/settings/ai-settings"
import { StorageSettings } from "@/components/settings/storage-settings"
import { AIChat } from "@/components/ai/ai-chat"
import { InitialSetup } from "@/components/initial-setup"
import { MarkdownImport } from "@/components/import/markdown-import"
import { setupEditorMonitoring } from '@/lib/editor-debug-utils'


// Sortable Item Component
const SortablePageItem = React.memo(function SortablePageItem({ page, isActive, expandedFolders, onToggleFolder, onSetCurrentPage, onRename, onDelete, onCreateChild, onCreateChildFolder, isDragOver }: {
  page: any
  isActive: boolean
  expandedFolders: string[]
  onToggleFolder: (folderId: string) => void
  onSetCurrentPage: (pageId: string) => void
  onRename: (pageId: string, title: string) => void
  onDelete: (pageId: string) => void
  onCreateChild: (title: string, parentId: string) => void
  onCreateChildFolder: (title: string, parentId: string) => void
  isDragOver?: boolean
}) {
  // Always call hooks in the same order - move useSortable to top level
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: page.id,
    disabled: false // 移除 isMounted 控制，减少状态复杂度
  })

  // Droppable zone for folders
  const {
    setNodeRef: setDroppableRef,
    isOver,
  } = useDroppable({
    id: page.id,
    disabled: !page.isFolder,
  })

  // Combine refs for folders that are both sortable and droppable
  const combinedRef = React.useCallback((node: HTMLElement | null) => {
    setNodeRef(node)
    if (page.isFolder) {
      setDroppableRef(node)
    }
  }, [setNodeRef, setDroppableRef, page.isFolder])

  const style = React.useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }), [transform, transition, isDragging])

  const Icon = page.isFolder ? Folder : FileText

  // 使用 useCallback 优化点击处理函数
  const handleClick = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (page.isFolder) {
      onToggleFolder(page.id)
    } else {
      onSetCurrentPage(page.id)
    }
  }, [page.id, page.isFolder, onToggleFolder, onSetCurrentPage])

  // Memo化图标内容
  const iconContent = React.useMemo(() => {
    if (page.isFolder) {
      return expandedFolders.includes(page.id) ? (
        <>
          <ChevronDown className="h-4 w-4" />
          <FolderOpen className="h-4 w-4" />
        </>
      ) : (
        <>
          <ChevronRight className="h-4 w-4" />
          <Folder className="h-4 w-4" />
        </>
      )
    } else {
      return <Icon className="h-4 w-4" />
    }
  }, [page.isFolder, expandedFolders, page.id, Icon])

  // Memo化按钮样式
  const buttonClassName = React.useMemo(() => {
    const baseClasses = "w-full justify-start gap-2 px-2 py-1.5 text-sm transition-colors duration-150"
    const activeClasses = isActive ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-100"
    const dragOverClasses = isOver && page.isFolder ? "bg-blue-100 border-2 border-blue-300 border-dashed" : ""
    
    return `${baseClasses} ${activeClasses} ${dragOverClasses}`
  }, [isActive, isOver, page.isFolder])

  const buttonStyle = React.useMemo(() => ({
    paddingLeft: `${8 + (page.indent || 0) * 16}px`
  }), [page.indent])

  return (
    <div ref={combinedRef} style={style}>
      <SidebarMenuItem>
        <PageContextMenu
          page={page}
          onRename={onRename}
          onDelete={onDelete}
          onCreateChild={onCreateChild}
          onCreateChildFolder={onCreateChildFolder}
        >
          <SidebarMenuButton
            onClick={handleClick}
            isActive={isActive}
            className={buttonClassName}
            style={buttonStyle}
            {...attributes}
            {...listeners}
          >
            {iconContent}
            <span className="truncate">{page.title}</span>
            {!page.isFolder && isActive && (
              <span className="text-orange-500 text-xs">•</span>
            )}
          </SidebarMenuButton>
        </PageContextMenu>
      </SidebarMenuItem>
    </div>
  )
})

// Root Level Droppable Component
const RootDroppable = ({ children }: { children: React.ReactNode }) => {
  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id: 'root-level',
  })

  return (
    <div 
      ref={setNodeRef}
      className={`min-h-full ${isOver ? 'bg-blue-50 border-2 border-blue-300 border-dashed rounded-lg' : ''}`}
    >
      {children}
      {isOver && (
        <div className="p-4 text-center text-blue-600 font-medium">
          Drop here to move to root level
        </div>
      )}
    </div>
  )
}

export function NoteTakingApp() {
  const {
    workspace,
    currentPageId,
    syncStatus,
    unsavedChanges,
    setCurrentPage,
    updatePageContent,
    createPage,
    createFolder,
    deletePage,
    renamePage,
    reorderPages,
    saveToLocal,
    loadFromLocal,
    getCurrentPage,
    setSyncStatus,
    isFirstTimeUse,
  } = useNotesStore()

  const [expandedFolders, setExpandedFolders] = React.useState<string[]>([])
  const [editor, setEditor] = React.useState<any>(null)
  const [isHydrated, setIsHydrated] = React.useState(false)
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)
  const [isAIChatOpen, setIsAIChatOpen] = React.useState(false)
  const [showInitialSetup, setShowInitialSetup] = React.useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false)

  const currentPage = getCurrentPage()


  React.useEffect(() => {
    setIsHydrated(true)
    // Manual hydration for Zustand store
    if (typeof window !== 'undefined') {
      useNotesStore.persist.rehydrate()
    }
  }, [])

  // Load data on mount after hydration
  React.useEffect(() => {
    if (isHydrated) {
      loadFromLocal()
    }
  }, [isHydrated, loadFromLocal])

  // First-time setup detection
  React.useEffect(() => {
    if (isHydrated && workspace) {
      const isFirstTime = isFirstTimeUse()
      setShowInitialSetup(isFirstTime)
    }
  }, [isHydrated, workspace, isFirstTimeUse])

  // Auto-save functionality
  React.useEffect(() => {
    if (unsavedChanges) {
      const autoSaveTimer = setTimeout(() => {
        saveToLocal()
      }, 2000) // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(autoSaveTimer)
    }
  }, [unsavedChanges, saveToLocal])

  // Drag and drop sensors - 优化配置避免与点击冲突
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // 需要拖拽8px以上才激活，避免与点击冲突
    },
  })
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
  const sensors = useSensors(pointerSensor, keyboardSensor)

  const handleContentChange = React.useCallback((content: string) => {
    if (currentPageId) {
      updatePageContent(currentPageId, content)
    }
  }, [currentPageId, updatePageContent])

  const handleInitialSetupComplete = React.useCallback(() => {
    setShowInitialSetup(false)
    // 创建一个欢迎页面
    createPage('欢迎使用笔记本', undefined)
  }, [createPage])

  const handleSyncNow = async () => {
    setSyncStatus('syncing')
    try {
      await saveToLocal()
      setSyncStatus('success')
      setTimeout(() => setSyncStatus('idle'), 2000)
    } catch (error) {
      setSyncStatus('error')
      setTimeout(() => setSyncStatus('idle'), 3000)
    }
  }

  const handleCreatePage = React.useCallback(() => {
    const title = `New Page`
    createPage(title)
  }, [createPage])

  const handleCreateFolder = React.useCallback(() => {
    const title = `New Folder`
    createFolder(title)
  }, [createFolder])

  const handleExport = () => {
    if (!currentPage) return
    
    // Create markdown content
    const markdownContent = `# ${currentPage.title}\n\n${currentPage.content}`
    
    // Create and download file
    const blob = new Blob([markdownContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentPage.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getSyncButtonText = () => {
    switch (syncStatus) {
      case 'syncing': return 'Syncing...'
      case 'success': return 'Synced'
      case 'error': return 'Sync Failed'
      default: return unsavedChanges ? 'Sync Now*' : 'Sync Now'
    }
  }



  const handleDragStart = (event: any) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    setActiveId(null)
    
    if (!over || active.id === over.id) return

    const draggedPage = workspace.pages.find(page => page.id === active.id)
    
    if (!draggedPage) return

    // If dropping on the root level
    if (over.id === 'root-level') {
      const updatedPages = workspace.pages.map(page => 
        page.id === draggedPage.id 
          ? { ...page, parentId: undefined }
          : page
      )
      reorderPages(updatedPages)
      return
    }

    const targetPage = workspace.pages.find(page => page.id === over.id)
    if (!targetPage) return

    // If dropping on a folder, move the item into the folder
    if (targetPage.isFolder) {
      const updatedPages = workspace.pages.map(page => 
        page.id === draggedPage.id 
          ? { ...page, parentId: targetPage.id }
          : page
      )
      reorderPages(updatedPages)
      
      // Auto-expand the target folder to show the moved item
      setExpandedFolders(prev => 
        prev.includes(targetPage.id) ? prev : [...prev, targetPage.id]
      )
    } else {
      // Regular reordering
      const oldIndex = workspace.pages.findIndex((page) => page.id === active.id)
      const newIndex = workspace.pages.findIndex((page) => page.id === over.id)
      
      const newPages = arrayMove(workspace.pages, oldIndex, newIndex)
      reorderPages(newPages)
    }
  }

  // 优化事件处理函数，使用 useCallback 减少重新渲染
  const memoizedToggleFolder = React.useCallback((folderId: string) => {
    setExpandedFolders((prev) => 
      prev.includes(folderId) 
        ? prev.filter((id) => id !== folderId) 
        : [...prev, folderId]
    )
  }, [])

  const memoizedCreateChild = React.useCallback((title: string, parentId: string) => {
    createPage(title, parentId)
  }, [createPage])

  const memoizedCreateChildFolder = React.useCallback((title: string, parentId: string) => {
    createFolder(title, parentId)
  }, [createFolder])

  // Render page tree recursively - memoized for performance with stable dependencies
  const renderPageTree = React.useCallback((pages: any[], parentId: string | null, depth: number) => {
    const filteredPages = pages.filter(page => 
      (parentId === null && (page.parentId === null || page.parentId === undefined)) ||
      (parentId !== null && page.parentId === parentId)
    )
    
    return filteredPages.map((page) => {
      const isActive = page.id === currentPageId
      const hasChildren = pages.some(p => p.parentId === page.id)
      const isExpanded = expandedFolders.includes(page.id)
      
      return (
        <div key={page.id}>
          <SortablePageItem
            page={{
              ...page,
              indent: depth,
              hasChildren
            }}
            isActive={isActive}
            expandedFolders={expandedFolders}
            onToggleFolder={memoizedToggleFolder}
            onSetCurrentPage={setCurrentPage}
            onRename={renamePage}
            onDelete={deletePage}
            onCreateChild={memoizedCreateChild}
            onCreateChildFolder={memoizedCreateChildFolder}
          />
          {page.isFolder && isExpanded && hasChildren && (
            <div style={{ marginLeft: `${(depth + 1) * 16}px` }}>
              {renderPageTree(pages, page.id, depth + 1)}
            </div>
          )}
        </div>
      )
    })
  }, [
    currentPageId, 
    expandedFolders, 
    setCurrentPage, 
    renamePage, 
    deletePage, 
    memoizedToggleFolder,
    memoizedCreateChild,
    memoizedCreateChildFolder
  ])

  // Initialize editor monitoring on mount
  React.useEffect(() => {
    setupEditorMonitoring()
  }, [])

  return (
    <>
      {showInitialSetup && (
        <InitialSetup onComplete={handleInitialSetupComplete} />
      )}
      {!showInitialSetup && (
        <SidebarProvider defaultOpen={true}>
      <Sidebar className="border-r border-gray-200">
        <SidebarHeader className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{workspace.name}</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-gray-200"
                  title="Create new..."
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleCreatePage}>
                  <FileText className="h-4 w-4 mr-2" />
                  New Page
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreateFolder}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={workspace.pages.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    <RootDroppable>
                      {renderPageTree(workspace.pages, null, 0)}
                    </RootDroppable>
                  </SortableContext>
                  <DragOverlay>
                    {activeId ? (
                      <div className="flex items-center gap-2 px-2 py-1.5 text-sm bg-white border border-gray-300 rounded shadow-lg">
                        {(() => {
                          const draggedPage = workspace.pages.find(p => p.id === activeId)
                          if (!draggedPage) return null
                          const Icon = draggedPage.isFolder ? Folder : FileText
                          return (
                            <>
                              <Icon className="h-4 w-4" />
                              <span>{draggedPage.title}</span>
                            </>
                          )
                        })()}
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="flex flex-col min-h-screen bg-gray-50">
        {/* 顶部工具栏 */}
        <header className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isHydrated ? (currentPage?.title || "No Page Selected") : "Loading..."}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-gray-600">
                    Last updated: {currentPage?.updatedAt ? (
                      <ClientDate date={currentPage.updatedAt} />
                    ) : (
                      'Never'
                    )}
                  </p>
                  {unsavedChanges && (
                    <span className="text-orange-600 text-sm font-medium">• Unsaved changes</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                className={`${
                  syncStatus === 'syncing' ? 'bg-yellow-600 hover:bg-yellow-700' :
                  syncStatus === 'success' ? 'bg-green-600 hover:bg-green-700' :
                  syncStatus === 'error' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-blue-600 hover:bg-blue-700'
                } text-white`}
                onClick={handleSyncNow}
                disabled={syncStatus === 'syncing'}
              >
                <Cloud className="h-4 w-4 mr-2" />
                {getSyncButtonText()}
              </Button>
              <Button 
                variant="outline" 
                className="border-gray-300 bg-transparent"
                onClick={handleExport}
                disabled={!currentPage}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="border-gray-300 bg-transparent"
                    title="Import Markdown Files"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Import Markdown Files</DialogTitle>
                    <DialogDescription>
                      Select multiple markdown files to import into your workspace.
                    </DialogDescription>
                  </DialogHeader>
                  <MarkdownImport 
                    onComplete={() => setIsImportDialogOpen(false)}
                    onClose={() => setIsImportDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
              <Button 
                variant="outline" 
                className="border-gray-300 bg-transparent"
                onClick={() => setIsAIChatOpen(true)}
              >
                <Bot className="h-4 w-4 mr-2" />
                AI对话
              </Button>
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="border-gray-300 bg-transparent"
                    title="Settings"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>设置</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <StorageSettings />
                    <WebDAVSettings />
                    <AISettings />
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={isAIChatOpen} onOpenChange={setIsAIChatOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>AI 对话</DialogTitle>
                    <DialogDescription>
                      与AI智能助手进行对话，获取写作灵感和帮助
                    </DialogDescription>
                  </DialogHeader>
                  <AIChat />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* 视图模式切换工具栏 */}
          <EditorToolbar editor={editor} />
        </header>

        {/* 主编辑区域 */}
        <main className="flex-1 p-6 bg-gray-50 overflow-hidden">
          <div className="w-full h-full">
            {currentPage ? (
              <WangEditorWrapper
                content={currentPage.content}
                onChange={handleContentChange}
                placeholder="Start writing your thoughts here..."
                onEditorReady={setEditor}
              />
            ) : (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-700 mb-2">No page selected</h2>
                  <p className="text-gray-500 mb-4">Select a page from the sidebar or create a new one to start writing.</p>
                  <Button onClick={handleCreatePage}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Page
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
      )}
    </>
  )
}
