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
        <span className="dropzone__title">Drop STL here</span>
        <button type="button" className="text-button dropzone__browse" onClick={onBrowse}>
          or choose a file
        </button>
      </div>
    </div>
  )
}
