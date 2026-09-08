// The endpoint accepts multipart/form-data (image) and returns
// { qualityScore: number (0–100), title: string, description: string }.
// Credentials belong on the application server, never in VITE_* variables.
export async function analyzeImage(imageUrl, { signal } = {}) {
  const endpoint = import.meta.env.VITE_IMAGE_ANALYSIS_URL
  if (!endpoint) throw new Error('尚未配置图片分析接口')
  const imageResponse = await fetch(imageUrl, { signal })
  if (!imageResponse.ok) throw new Error('无法读取上传图片，请重新上传')
  const image = await imageResponse.blob()
  const body = new FormData()
  body.append('image', image, 'attachment')
  const response = await fetch(endpoint, { method: 'POST', body, signal })
  if (!response.ok) throw new Error(`图片分析失败（${response.status}），请重试`)
  const result = await response.json()
  if (!Number.isFinite(result.qualityScore) || result.qualityScore < 0 || result.qualityScore > 100 || typeof result.title !== 'string' || !result.title.trim() || typeof result.description !== 'string' || !result.description.trim()) {
    throw new Error('分析结果不完整，请重试')
  }
  return { qualityScore: Math.round(result.qualityScore), title: result.title.trim(), description: result.description.trim() }
}
