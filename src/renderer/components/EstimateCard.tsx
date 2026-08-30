import { Gauge, Gem, LoaderCircle, Zap } from 'lucide-react'
import type { QualityPresetId, QualityProfile } from '@shared/profiles/quality.js'
import { formatGrams } from '@shared/utils/cost.js'
import { formatDuration } from '@shared/utils/time.js'
import type { PresetState } from '../state.js'
import './estimate-card.css'

/** One hue per preset: warm for speed, brand for the default, cool for detail. */
const ICONS: Record<QualityPresetId, typeof Zap> = {
  fast: Zap,
  standard: Gauge,
  quality: Gem,
}

interface Props {
  readonly profile: QualityProfile
  readonly state: PresetState
  readonly isSelected: boolean
  readonly onSelect: () => void
}

export function EstimateCard({ profile, state, isSelected, onSelect }: Props): JSX.Element {
  const estimate = state.estimate
  const Icon = ICONS[profile.id]

  const classes = [
    'estimate',
    `estimate--${profile.id}`,
    isSelected ? 'is-selected' : '',
    profile.recommended ? 'is-recommended' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={classes} onClick={onSelect} aria-pressed={isSelected}>
      <span className="estimate__head">
        <span className="estimate__icon">
          <Icon size={13} strokeWidth={2.1} />
        </span>
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
          <span className="estimate__pending">
            <LoaderCircle className="spin" size={14} strokeWidth={2.2} />
            Slicing…
          </span>
        ) : (
          <span className="estimate__pending estimate__pending--idle">—</span>
        )}
      </span>

      <span className="estimate__foot">
        {profile.recommended && <span className="estimate__badge">Recommended</span>}
        {estimate?.approximate && <span className="estimate__approx">Approximate</span>}
        {/* Each preset lays down a slightly different amount of plastic. */}
        {estimate?.filamentWeightGrams ? (
          <span className="estimate__weight">{formatGrams(estimate.filamentWeightGrams)}</span>
        ) : null}
      </span>
    </button>
  )
}
