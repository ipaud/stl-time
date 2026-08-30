import { CircleCheck, Coins, Ruler, Scan, TriangleAlert, Weight } from 'lucide-react'
import { ADVENTURER_5M_PRO } from '@shared/printers/adventurer5mpro.js'
import { QUALITY_PROFILES, type QualityPresetId } from '@shared/profiles/quality.js'
import type { ModelAnalysis, PrintEstimate } from '@shared/types.js'
import { axisLabel, checkFit } from '@shared/utils/fit.js'
import {
  filamentCost,
  formatCost,
  formatDimensions,
  formatGrams,
  formatLength,
} from '@shared/utils/cost.js'
import { EstimateCard } from './EstimateCard.js'
import type { AppState } from '../state.js'
import './results-panel.css'

interface Props {
  readonly state: AppState
  readonly analysis: ModelAnalysis
  readonly detail: PrintEstimate | null
  readonly pricePerKg: number
  readonly onSelect: (preset: QualityPresetId) => void
}

export function ResultsPanel({
  state,
  analysis,
  detail,
  pricePerKg,
  onSelect,
}: Props): JSX.Element {
  const fit = checkFit(analysis.dimensions, ADVENTURER_5M_PRO)
  const selected = QUALITY_PROFILES.find((p) => p.id === state.selected)

  return (
    <div className="results">
      <div className="results__meta">
        <span className="results__dims">
          <Scan size={13} strokeWidth={1.9} />
          {formatDimensions(analysis.dimensions.x, analysis.dimensions.y, analysis.dimensions.z)}
        </span>
        <FitBadge fit={fit} />
      </div>

      <div className="estimates">
        {QUALITY_PROFILES.map((profile) => (
          <EstimateCard
            key={profile.id}
            profile={profile}
            state={state.presets[profile.id] ?? { progress: 'pending' }}
            isSelected={state.selected === profile.id}
            onSelect={() => onSelect(profile.id)}
          />
        ))}
      </div>

      <dl className="detail">
        <span className="label detail__title">{selected?.label}</span>
        <Metric
          icon={<Weight size={13} strokeWidth={1.9} />}
          label="Filament"
          value={detail?.filamentWeightGrams ? formatGrams(detail.filamentWeightGrams) : '—'}
        />
        <Metric
          icon={<Ruler size={13} strokeWidth={1.9} />}
          label="Length"
          value={detail?.filamentLengthMm ? formatLength(detail.filamentLengthMm) : '—'}
        />
        <Metric
          icon={<Coins size={13} strokeWidth={1.9} />}
          label="Cost"
          value={
            detail?.filamentWeightGrams
              ? `${detail.approximate ? '~' : ''}${formatCost(
                  filamentCost(detail.filamentWeightGrams, pricePerKg),
                )}`
              : '—'
          }
        />
      </dl>
    </div>
  )
}

interface MetricProps {
  readonly icon: JSX.Element
  readonly label: string
  readonly value: string
}

function Metric({ icon, label, value }: MetricProps): JSX.Element {
  return (
    <div className="metric">
      <dt className="metric__label">
        {icon}
        {label}
      </dt>
      <dd className="metric__value">{value}</dd>
    </div>
  )
}

function FitBadge({ fit }: { fit: ReturnType<typeof checkFit> }): JSX.Element {
  if (fit.fits) {
    return (
      <span className="fit fit--ok">
        <CircleCheck size={13} strokeWidth={2} />
        Fits {ADVENTURER_5M_PRO.name}
      </span>
    )
  }

  const worst = fit.exceeded[0]

  return (
    <span className="fit fit--bad">
      <span className="fit__headline">
        <TriangleAlert size={13} strokeWidth={2} />
        Too large for {ADVENTURER_5M_PRO.name}
      </span>
      {worst && (
        <span className="fit__detail">
          Model {axisLabel(worst.axis)} {Math.round(worst.modelMm)} mm · limit {worst.limitMm} mm
        </span>
      )}
    </span>
  )
}
