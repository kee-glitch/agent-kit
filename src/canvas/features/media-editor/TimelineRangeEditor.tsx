export function TimelineRangeEditor({ duration, inPoint, outPoint, onChange }: { duration: number; inPoint: number; outPoint: number; onChange(value: { inPoint: number; outPoint: number }): void }) {
  return <fieldset className="timeline-range"><legend>片段范围</legend>
    <label>入点<input aria-label="入点" type="number" min={0} max={outPoint} step="0.1" value={inPoint} onChange={(event) => onChange({ inPoint: Number(event.target.value), outPoint })} /></label>
    <label>出点<input aria-label="出点" type="number" min={inPoint} max={duration} step="0.1" value={outPoint} onChange={(event) => onChange({ inPoint, outPoint: Number(event.target.value) })} /></label>
    <output>{inPoint.toFixed(1)}s – {outPoint.toFixed(1)}s</output>
  </fieldset>
}
