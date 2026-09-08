export function buildScriptAssets(groups, images, resources = {}, imageDetails = {}) {
  const assets = []
  const used = new Set()
  for (const [type, , names] of groups) {
    for (const title of names) {
      const match = Object.entries(resources).find(([, resource]) => resource.name === title)
      const resource = match?.[1]
      const thumbnail = resource?.thumbnail && images.includes(resource.thumbnail) ? resource.thumbnail : ''
      if (thumbnail) used.add(thumbnail)
      assets.push({sourceKey:`element:${type}:${title}`,referenceKey:match?.[0],type,title,
        description:resource?.description || `${title}，用于剧本中的${type}参考。`,thumbnail,
        mediaType:'image',skill:'',state:thumbnail ? 'bound' : 'missing'})
    }
  }
  for (const thumbnail of new Set(images)) {
    if (used.has(thumbnail)) continue
    const detail = imageDetails[thumbnail]
    assets.push({sourceKey:`attachment:${thumbnail}`,type:'道具',title:detail?.title || `剧本参考附件 ${assets.filter(asset=>asset.sourceKey.startsWith('attachment:')).length+1}`,
      description:detail?.description || '来自剧本创作的参考附件，可修改类型、标题和描述。',thumbnail,mediaType:'image',skill:'',state:'bound'})
  }
  return assets.map((asset,index)=>({...asset,id:index+1}))
}
