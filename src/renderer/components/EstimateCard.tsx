import type { QualityProfile } from '@shared/profiles/quality.js'
import { formatDuration } from '@shared/utils/time.js'
import type { PresetState } from '../state.js'
import './estimate-card.css'

interface Props {
  readonly profile: QualityProfile
  readonly state: PresetState
  readonly isSelected: boolean
  readonly onSelect: () => void
}

export function EstimateCard({ profile, state, isSelected, onSelect }: Props): JSX.Element {
  const estimate = state.estimate
  const classes = [
    'estimate',
    isSelected ? 'is-selected' : '',
    profile.recommended ? 'is-recommended' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={classes} onClick={onSelect} aria-pressed={isSelected}>
      <span className="estimate__head">
        <span className="label estimate__name">{profile.label}</span>
        <span className="estimate__layer">{profile.layerHeight.toFixed(2)} mm</span>
      </span>

      <span className="estimate__time">
        {estimate ? (
          <>
            {/* The tilde is the whole difference between a slice and a guess. */}
            {estimate.approximate && <span className="estimate__approx-mark">≈ </span>}
            {formatDuration(estimate.estimatedSeconds)}
          </>
        ) : state.progress === 'processing' ? (
          <span className="estimate__pending">calculating…</span>
        ) : (
          <span className="estimate__pending">—</span>
        )}
      </span>

      <span className="estimate__foot">
        {profile.recommended && <span className="estimate__badge">Recommended</span>}
        {estimate?.approximate && <span className="estimate__approx">Approximate</span>}
      </span>
    </button>
  )
}
