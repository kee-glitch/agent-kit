import type { MediaEditorDraft } from '../../domain/canvas/types'
import { applyEditorEdit } from './mediaEditorModel'
export function CropEditor({ draft, onChange }: { draft: MediaEditorDraft; onChange(draft: MediaEditorDraft): void }) {
  const update = (crop: typeof draft.crop) => onChange(applyEditorEdit(draft, { crop }))
  return <fieldset><legend>裁剪画面</legend><label>裁剪比例<select aria-label="裁剪比例" value={draft.crop.aspectRatio} onChange={(event) => update({ ...draft.crop, aspectRatio: event.target.value as typeof draft.crop.aspectRatio })}>{['free', '1:1', '9:16', '16:9', '4:3'].map((value) => <option key={value}>{value}</option>)}</select></label><label><input aria-label="显示安全区" type="checkbox" checked={draft.crop.showSafeArea} onChange={(event) => update({ ...draft.crop, showSafeArea: event.target.checked })} />显示安全区</label></fieldset>
}
