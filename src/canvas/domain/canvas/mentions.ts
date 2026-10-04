const mentionPattern = /@\[[^\]]*\]\(node:([^\s)]+)\)/g

export function formatMentionToken(node: { id: string; name: string }): string {
  const label = node.name.replace(/[\[\]]/g, '').trim() || '未命名节点'
  return `@[${label}](node:${node.id})`
}

export function parseMentionTokens(prompt: string): string[] {
  const ids: string[] = []
  for (const match of prompt.matchAll(mentionPattern)) if (!ids.includes(match[1])) ids.push(match[1])
  return ids
}

export function removeMentionTokens(prompt: string, nodeId: string): string {
  return prompt.replace(mentionPattern, (token, id: string) => id === nodeId ? '' : token)
    .replace(/ {2,}/g, ' ').replace(/^ | $/g, '')
}
