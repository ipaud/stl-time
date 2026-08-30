import { FolderOpen } from 'lucide-react'
import markUrl from '../assets/mark.svg'
import './drop-zone.css'

interface Props {
  readonly onBrowse: () => void
  readonly isOver: boolean
}

/** The empty state. Dragging is handled window-wide by useFileDrop. */
export function DropZone({ onBrowse, isOver }: Props): JSX.Element {
  return (
    <div className="dropzone">
      <div className={`dropzone__target${isOver ? ' is-over' : ''}`}>
        <img className="dropzone__mark" src={markUrl} alt="" width={44} height={51} />
        <span className="dropzone__title">Drop an STL here</span>
        <span className="dropzone__hint">and it will tell you how long it takes to print</span>
        <button type="button" className="dropzone__browse" onClick={onBrowse}>
          <FolderOpen size={13} strokeWidth={1.9} />
          Choose a file
        </button>
      </div>
    </div>
  )
}
