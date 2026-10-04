import type { MediaEditorDraft } from '../../domain/canvas/types'
export function SpliceEditor({ draft, names, onChange }: { draft: MediaEditorDraft; names: Record<string, string>; onChange(ids: string[]): void }) {
  return <section aria-label="拼接片段"><ol>{draft.clipNodeIds.map((id, index) => <li key={id}>{names[id] ?? id}<button type="button" disabled={index === 0} onClick={() => { const ids = [...draft.clipNodeIds]; [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]; onChange(ids) }}>上移</button><button type="button" aria-label={`移除${names[id] ?? id}`} onClick={() => onChange(draft.clipNodeIds.filter((item) => item !== id))}>移除</button></li>)}</ol>{draft.clipNodeIds.length < 2 && <p role="alert">至少需要两个视频片段</p>}</section>
}
