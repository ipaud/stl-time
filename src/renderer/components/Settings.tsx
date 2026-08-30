import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import type { AppSettings } from '@shared/types.js'
import './settings.css'

interface Props {
  readonly settings: AppSettings
  readonly onSave: (settings: AppSettings) => void
  readonly onClose: () => void
}

export function Settings({ settings, onSave, onClose }: Props): JSX.Element {
  const [price, setPrice] = useState(String(settings.plaPricePerKg))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const commit = (): void => {
    const value = Number(price)
    onSave({ plaPricePerKg: Number.isFinite(value) && value >= 0 ? value : settings.plaPricePerKg })
    onClose()
  }

  return (
    <div className="settings-backdrop" onMouseDown={onClose}>
      <div
        className="settings"
        role="dialog"
        aria-label="Settings"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="settings__head">
          <h2 className="settings__title">Settings</h2>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <label className="settings__field">
          <span className="settings__label">PLA price per kg</span>
          <span className="settings__input-wrap">
            <span className="settings__prefix">€</span>
            <input
              ref={inputRef}
              type="number"
              min="0"
              max="1000"
              step="0.5"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commit()
              }}
            />
          </span>
        </label>

        <p className="settings__note">Used only to work out what a print costs.</p>

        <div className="settings__actions">
          <button type="button" className="text-button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="settings__save" onClick={commit}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
