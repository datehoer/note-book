"use client"

import * as React from "react"
import { MoreHorizontal, Edit2, Trash2, FolderPlus, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Page } from "@/lib/types"

interface PageContextMenuProps {
  page: Page
  onRename: (pageId: string, newTitle: string) => void
  onDelete: (pageId: string) => void
  onCreateChild: (title: string, parentId: string) => void
  onCreateChildFolder: (title: string, parentId: string) => void
  children: React.ReactNode
}

export function PageContextMenu({
  page,
  onRename,
  onDelete,
  onCreateChild,
  onCreateChildFolder,
  children
}: PageContextMenuProps) {
  const [isRenameOpen, setIsRenameOpen] = React.useState(false)
  const [isCreateChildOpen, setIsCreateChildOpen] = React.useState(false)
  const [isCreateChildFolderOpen, setIsCreateChildFolderOpen] = React.useState(false)
  const [newTitle, setNewTitle] = React.useState(page.title)
  const [childTitle, setChildTitle] = React.useState("")
  const [childFolderTitle, setChildFolderTitle] = React.useState("")

  const handleRename = () => {
    if (newTitle.trim() && newTitle !== page.title) {
      onRename(page.id, newTitle.trim())
    }
    setIsRenameOpen(false)
  }

  const handleCreateChild = () => {
    if (childTitle.trim()) {
      onCreateChild(childTitle.trim(), page.id)
      setChildTitle("")
    }
    setIsCreateChildOpen(false)
  }

  const handleCreateChildFolder = () => {
    if (childFolderTitle.trim()) {
      onCreateChildFolder(childFolderTitle.trim(), page.id)
      setChildFolderTitle("")
    }
    setIsCreateChildFolderOpen(false)
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${page.title}"?`)) {
      onDelete(page.id)
    }
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem onClick={() => setIsRenameOpen(true)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Rename
          </ContextMenuItem>
          
          {page.isFolder && (
            <>
              <ContextMenuItem onClick={() => setIsCreateChildOpen(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Add Page
              </ContextMenuItem>
              <ContextMenuItem onClick={() => setIsCreateChildFolderOpen(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Add Folder
              </ContextMenuItem>
            </>
          )}
          
          <ContextMenuSeparator />
          
          <ContextMenuItem 
            onClick={handleDelete}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Rename Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Page</DialogTitle>
            <DialogDescription>
              Change the title of this page. The new title will be updated throughout the application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="page-title">Page Title</Label>
              <Input
                id="page-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleRename()}
                autoFocus
                placeholder="Enter page title..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRename}>
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Child Dialog */}
      <Dialog open={isCreateChildOpen} onOpenChange={setIsCreateChildOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Page in "{page.title}"</DialogTitle>
            <DialogDescription>
              Create a new page inside this folder. The page will be added as a child of the current folder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="child-title">Page Title</Label>
              <Input
                id="child-title"
                value={childTitle}
                onChange={(e) => setChildTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateChild()}
                autoFocus
                placeholder="Enter page title..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateChildOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateChild}>
                Create Page
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Child Folder Dialog */}
      <Dialog open={isCreateChildFolderOpen} onOpenChange={setIsCreateChildFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder in "{page.title}"</DialogTitle>
            <DialogDescription>
              Create a new folder inside this folder. The folder will be added as a child of the current folder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="child-folder-title">Folder Title</Label>
              <Input
                id="child-folder-title"
                value={childFolderTitle}
                onChange={(e) => setChildFolderTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateChildFolder()}
                autoFocus
                placeholder="Enter folder title..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateChildFolderOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateChildFolder}>
                Create Folder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}