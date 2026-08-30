/** Filament cost from a spool price. 50 g of a 20 EUR/kg spool -> 1.00 */
export function filamentCost(grams: number, pricePerKg: number): number {
  if (!Number.isFinite(grams) || !Number.isFinite(pricePerKg)) return 0
  return (grams / 1000) * pricePerKg
}

export function formatCost(value: number, currency = '€'): string {
  return `${currency}${value.toFixed(2)}`
}

export function formatGrams(grams: number): string {
  return `${grams < 10 ? grams.toFixed(1) : Math.round(grams)} g`
}

/** Filament length is reported in metres; millimetres are meaningless to a human. */
export function formatLength(millimetres: number): string {
  const metres = millimetres / 1000
  return `${metres < 10 ? metres.toFixed(2) : metres.toFixed(1)} m`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDimensions(x: number, y: number, z: number): string {
  const r = (n: number) => (n < 10 ? n.toFixed(1) : Math.round(n).toString())
  return `${r(x)} × ${r(y)} × ${r(z)} mm`
}
