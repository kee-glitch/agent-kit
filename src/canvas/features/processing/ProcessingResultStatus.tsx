export function ProcessingResultStatus({ branches }: { branches: { id: string; name: string; status: string }[] }) {
  const labels: Record<string, string> = { completed: '已完成', failed: '失败', cancelled: '已取消', processing: '处理中', queued: '排队中' }
  return <section className="processing-results" aria-label="处理结果分支">{branches.map((branch) => <p key={branch.id}>{branch.name}：{labels[branch.status] ?? branch.status}</p>)}</section>
}
