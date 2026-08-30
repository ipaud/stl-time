import { useEffect, useState } from 'react'

/**
 * Window-level drag handling. Doing it here rather than with an overlay element
 * keeps the 3D canvas fully interactive while still accepting a dropped file
 * anywhere in the window.
 */
export function useFileDrop(onFiles: (files: FileList) => void): boolean {
  const [isOver, setIsOver] = useState(false)

  useEffect(() => {
    let depth = 0

    const onDragEnter = (event: DragEvent): void => {
      if (!event.dataTransfer?.types.includes('Files')) return
      event.preventDefault()
      depth += 1
      setIsOver(true)
    }

    const onDragOver = (event: DragEvent): void => {
      if (!event.dataTransfer?.types.includes('Files')) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
    }

    const onDragLeave = (): void => {
      depth = Math.max(0, depth - 1)
      if (depth === 0) setIsOver(false)
    }

    const onDrop = (event: DragEvent): void => {
      event.preventDefault()
      depth = 0
      setIsOver(false)
      const files = event.dataTransfer?.files
      if (files && files.length > 0) onFiles(files)
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)

    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [onFiles])

  return isOver
}
