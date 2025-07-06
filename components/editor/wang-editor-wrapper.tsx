"use client"

import dynamic from 'next/dynamic'
import { WangEditorProps } from './wang-editor'

const WangEditor = dynamic(() => import('./wang-editor').then(mod => ({ default: mod.WangEditor })), {
  ssr: false,
  loading: () => (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-4">
      <div className="h-[400px] flex items-center justify-center text-gray-500">
        Loading editor...
      </div>
    </div>
  )
})

export function WangEditorWrapper(props: WangEditorProps) {
  return <WangEditor {...props} />
}

export type { WangEditorProps }