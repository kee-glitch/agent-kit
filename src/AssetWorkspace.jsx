import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Box, Check, ChevronDown, ChevronRight, Download, ExternalLink, FileBarChart, Film, FolderOpen, GalleryVerticalEnd, Grid2X2, Image, LayoutGrid, Link2, List, MoreHorizontal, Package, Pencil, Search, ShieldCheck, SlidersHorizontal, Trash2, Upload, Users, X } from 'lucide-react'
import { gsap } from 'gsap'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import marketingAnalysisMarkdown from './marketing-analysis.md?raw'

const currentUserId = 'user_1024'
const sourceAvatarColor=name=>`avatar-color-${Array.from(name||'').reduce((total,char)=>total+char.codePointAt(0),0)%9}`

// 仅引用花瓣公开页面实际加载的高清 CDN 资源，不把图片写入项目。
const huabanMedia = {
  square: 'https://gaoding-market.dancf.com/market-operations/market/side/503baea7b7334985a68b4f965d56d0c7/1782096304506.png',
  portraitXL: 'https://gaoding-market.dancf.com/market-operations/market/side/334fee6d3f1f41fdb2564b4a4c05f2c4/1784873106117.jpg',
  posterA: 'https://gaoding-market.dancf.com/market-operations/market/side/1abf5ea59f3c46a08cf3a15955a76bb9/1784873226168.jpg',
  posterB: 'https://gaoding-market.dancf.com/market-operations/market/side/f3353952a7654dfa86ebecd1d285480d/1784873241959.png',
  posterC: 'https://gaoding-market.dancf.com/market-operations/market/side/8a9a68d6e4cc48348850217ae88c187c/1784873235764.png',
  lightA: 'https://gaoding-market.dancf.com/market-operations/market/side/9ede3f56c49940e3900741daa42bc802/1784873116557.jpg',
  demoVideo: 'https://lf9-cdn-tos.bytecdntp.com/cdn/expire-1-M/byted-player-videos/1.0.0/xgplayer-demo.mp4',
}

const providedImages = [
  "https://p26-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/226faf82fe5c4e2aab443bc5b904906b~tplv-tb4s082cfz-aigc_resize:2048:2048.webp?lk3s=4fa96020&x-expires=1789776000&x-signature=3B1M3OPDxVRVnH7aCIZFp3WF9xQ%3D",
  "https://p26-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/c1e72a1c5b7344b8b7c93537d0f0f8f4~tplv-tb4s082cfz-aigc_resize:2048:2048.webp?lk3s=4fa96020&x-expires=1789776000&x-signature=AyF3cMvm0GmLDl2qI%2FcPsbqbDRk%3D",
  "https://p26-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/7dc5a08a6dce4644bc31a7f2bc698e79~tplv-tb4s082cfz-aigc_resize:2048:2048.webp?lk3s=4fa96020&x-expires=1789776000&x-signature=y8N1ZGwvxRyRi5EnCRoHI53%2BxBk%3D",
  "https://p26-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/7cb06f6910d04108a85906b5a1aa91fc~tplv-tb4s082cfz-aigc_resize:2048:2048.webp?lk3s=4fa96020&x-expires=1789776000&x-signature=HeYza0lDY8uvhaK44D6rB7xUG7I%3D",
  "https://p11-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/2fc8918f7f6e4368afacc465c31303d2~tplv-tb4s082cfz-aigc_resize:2048:2048.webp?lk3s=4fa96020&x-expires=1789776000&x-signature=Dbjz0XzL4CKmrrvpG8y3pMVntfs%3D",
  "https://p26-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/8c823a4d335649a2851dc21471091a99~tplv-tb4s082cfz-aigc_resize:2048:2048.webp?lk3s=4fa96020&x-expires=1789776000&x-signature=CwEJbem9Sc1zWUbCGAT7UIDBcB0%3D",
  "https://p26-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/3beeaee337dc40beba2dbc6ff039a699~tplv-tb4s082cfz-aigc_resize:2048:2048.webp?lk3s=4fa96020&x-expires=1789776000&x-signature=uFcNWoBxBpLzXCShcHGdmiMzi2o%3D",
  "https://p26-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/a5b6313eedd946b295344011f4e3137b~tplv-tb4s082cfz-aigc_resize:2048:2048.webp?lk3s=4fa96020&x-expires=1789776000&x-signature=TgTN0shqv47ZS7whs6sZWqUg8oQ%3D",
  "https://p26-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/9934059498bd4b54977cf5e73b135ec9~tplv-tb4s082cfz-aigc_resize:2048:2048.webp?lk3s=4fa96020&x-expires=1789776000&x-signature=zKk6R8gxUhZ%2BtHW3Z51YKXvisKQ%3D",
  "https://p26-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/f35d9d2b808347bfa821cba13842987c~tplv-tb4s082cfz-aigc_resize:2048:2048.webp?lk3s=4fa96020&x-expires=1789776000&x-signature=ybhQjCtUxrYvRxE9D4GhAT24LAE%3D",
  "https://p26-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/9d019298d6af4379a9ab89d523ec4b49~tplv-tb4s082cfz-aigc_resize:2048:2048.webp?lk3s=4fa96020&x-expires=1789776000&x-signature=%2FPPgEzaqdU5CpTEb3Q8aIc1jz48%3D",
  "https://p26-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/c5f061614f87462491396e28a5cd320b~tplv-tb4s082cfz-aigc_resize:2048:2048.webp?lk3s=4fa96020&x-expires=1789776000&x-signature=AeTMunBxxXYSH9Jf%2BxMaWMzndoM%3D",
  "https://p11-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/2286b76f84d0441e83e24045839264c6~tplv-tb4s082cfz-aigc_resize:2048:2048.webp?lk3s=4fa96020&x-expires=1789776000&x-signature=alw%2FhzUGKpSCJRulxNT4GvWMoOc%3D",
  "https://p11-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/41c2a85788d44f9d9fed145f2e9b3097~tplv-tb4s082cfz-aigc_resize:2048:2048.webp?lk3s=4fa96020&x-expires=1789776000&x-signature=tHlGiSUvR1CizbbMXEWPQ8ICixk%3D"
]
export { providedImages as mockPreviewImages }
const providedVideos = [
  "https://v6-artist.vlabvod.com/61d36cde2787fd42cd52b82e729c1103/6a9fbf59/video/tos/cn/tos-cn-v-148450/oQQQxAqs6Q9c0iDh7EA7gyJcENItecDG4pTZPr/?a=4066&ch=0&cr=0&dr=0&er=0&cd=0%7C0%7C0%7C0&br=6632&bt=6632&cs=0&ds=12&ft=5QYTUxhhe6BMyqTp_2eJD12Nzj&mime_type=video_mp4&qs=0&rc=ZzhnaWU6ZDY0Njo6aWk5ZEBpamttbTxrb2ttOjczNDM7M0A1MDAyLTItNmAxX2AxXjE1YSMuMl9xcWdeb2lhLS1kNC9zcw%3D%3D&btag=80000e00008000&dy_q=1788249300&feature_id=04b16e464b574158bb99cac30ccb1f5e&l=20260901155459E3FB3EFB5393E2E14EFE",
  "https://v26-artist.vlabvod.com/183e2417a43115f3afc8fa76f92d2554/6a9fdfa0/video/tos/cn/tos-cn-v-148450/okoy6bQkBQC7LhAeHTaQEUEyeILe0bDzmtBOBs/?a=4066&ch=0&cr=0&dr=0&er=0&cd=0%7C0%7C0%7C0&br=18242&bt=18242&cs=0&ds=12&ft=5QYTUxhhe6BMyqQhJ2eJD12Nzj&mime_type=video_mp4&qs=0&rc=ZTxnMzw8OmZnZzRmOWU7NkBpampkZTZvOjs5PDczNDM7M0BiLjQxYl9fNi4xYF4yMjQ1YSMtLzNzYWFecnFhLS1kNC9zcw%3D%3D&btag=80000e00008000&dy_q=1788257563&feature_id=04b16e464b574158bb99cac30ccb1f5e&l=202609011812425E09B75C6C7B56CE7ABB",
  "https://v9-artist.vlabvod.com/8825e13449be5c7e9bce3c3c542dd1bf/6a9fdfb0/video/tos/cn/tos-cn-v-148450/o0UFNWEEhgEkdJ4MIqwQ9aIxjrQmIXbQbt0TK/?a=4066&ch=0&cr=0&dr=0&er=0&cd=0%7C0%7C0%7C0&br=2137&bt=2137&cs=0&ds=4&ft=5QYTUxhhe6BMyqDhJ2eJD12Nzj&mime_type=video_mp4&qs=0&rc=ZTwzNTdkNzVoMzQ6OzZnZkBpM2RrO2VvOnJmPDczNDM7M0AzMy1iXmNgNTAxL18xXi5eYSMxa3IzYWFeNmZhLS1kNC9zcw%3D%3D&btag=80000e00010000&dy_q=1788257564&feature_id=f0150a16a324336cda5d6dd0b69ed299&l=202609011812446B0F4F052E8766D7BB40",
  "https://v9-artist.vlabvod.com/5960d4f4b8cb2181da36c666a489d619/6a9fdfa6/video/tos/cn/tos-cn-v-148450/owoJHJZ1a1YSIQ7oWqftgDTaAsXMOEgzzAhJQA/?a=4066&ch=0&cr=0&dr=0&er=0&cd=0%7C0%7C0%7C0&br=18838&bt=18838&cs=0&ds=12&ft=5QYTUxhhe6BMyqDhJ2eJD12Nzj&mime_type=video_mp4&qs=0&rc=MzxpZzs7PGlpMzs8ZDYzZ0BpMzxvNjNvOjdvPDczNDM7M0BgYl40MC9fNjExMV4vNTUtYSMzci81YWFuZ21hLS1kNC9zcw%3D%3D&btag=80000e00008000&dy_q=1788257564&feature_id=04b16e464b574158bb99cac30ccb1f5e&l=202609011812446B0F4F052E8766D7BB40",
  "https://v9-artist.vlabvod.com/9702fd5252fa4730af04d9f24dc77faa/6a9fdfa1/video/tos/cn/tos-cn-v-148450/oYNoEtaFJTOg9aJfEdjAcankaq7DR1MhQQAIIx/?a=4066&ch=0&cr=0&dr=0&er=0&cd=0%7C0%7C0%7C0&br=22035&bt=22035&cs=0&ds=12&ft=5QYTUxhhe6BMyqDhJ2eJD12Nzj&mime_type=video_mp4&qs=0&rc=Zmk0Njs0ZmlnOmY6N2U4NUBpank7cDdvOmg7ZDczNDM7M0BhLy5jYV9gXzExYjYwL2ItYSNiYjNqYWFebjFhLS1kNC9zcw%3D%3D&btag=80000e00008000&dy_q=1788257564&feature_id=04b16e464b574158bb99cac30ccb1f5e&l=202609011812446B0F4F052E8766D7BB40",
  "https://v9-artist.vlabvod.com/41b9dbae77542a8c70fd0ab43bdde94b/6a9fdfa1/video/tos/cn/tos-cn-v-148450/oksXtgCDpBK7woVFEIixfSQNHA2mfsVgmBI6FO/?a=4066&ch=0&cr=0&dr=0&er=0&cd=0%7C0%7C0%7C0&br=6904&bt=6904&cs=0&ds=12&ft=5QYTUxhhe6BMyqDhJ2eJD12Nzj&mime_type=video_mp4&qs=0&rc=OTpoO2g0M2dpNDs8PGRmNkBpM3JmZnc5cm1rOTczNDM7M0AtMGBjLl42NTMxLzFhYF82YSNfaW9nMmRrX21hLS1kNC9zcw%3D%3D&btag=80000e00008000&dy_q=1788257564&feature_id=04b16e464b574158bb99cac30ccb1f5e&l=202609011812446B0F4F052E8766D7BB40"
]
const localDemoVideos = [1,2,3,4,5,7,8,9,10,11,12].map(index=>`${import.meta.env.BASE_URL}demo-videos/demo-video-${String(index).padStart(2,'0')}.mp4`)
const localVideoSpecs = [
  {ratio:'31:54',clarity:'864P',duration:'00:15',fileSize:'2.8 MB'},
  {ratio:'31:54',clarity:'864P',duration:'00:15',fileSize:'3.4 MB'},
  {ratio:'31:54',clarity:'864P',duration:'00:15',fileSize:'2.8 MB'},
  {ratio:'9:16',clarity:'720P',duration:'00:15',fileSize:'8.7 MB'},
  {ratio:'31:54',clarity:'864P',duration:'00:15',fileSize:'4.5 MB'},
  {ratio:'16:9',clarity:'720P',duration:'00:05',fileSize:'4.3 MB'},
  {ratio:'9:16',clarity:'720P',duration:'00:10',fileSize:'23.1 MB'},
  {ratio:'7:3',clarity:'630P',duration:'00:05',fileSize:'13.6 MB'},
  {ratio:'540:953',clarity:'1080P',duration:'00:21',fileSize:'5.4 MB'},
  {ratio:'9:16',clarity:'1080P',duration:'00:07',fileSize:'2.0 MB'},
  {ratio:'9:16',clarity:'1080P',duration:'01:51',fileSize:'12.6 MB'},
]

const seedAssets = [
  { id:'asset_0188', name:'品牌光效视觉', description:'用于品牌活动主视觉的方形光影素材。', type:'图片', group:'素材库', scope:'个人资产', source:'林屿', url:huabanMedia.square, previewUrl:huabanMedia.square, resolution:'2000 × 2000', ratio:'1:1', fileType:'PNG', fileSize:'4.6 MB', tone:'ocean', date:'今天 14:32', creatorId:currentUserId },
  { id:'asset_0187', name:'竖屏动态作品 01', description:'AI 生成的竖屏动态视觉素材。', type:'视频', group:'素材库', scope:'个人资产', source:'林屿', url:localDemoVideos[0], previewUrl:providedImages[0], ...localVideoSpecs[0], fileType:'MP4', tone:'lime', date:'今天 11:08', creatorId:currentUserId },
  { id:'work_0096', name:'东方美学人物海报', description:'东方人物造型与留白排版结合的竖版视觉提案。', type:'图片作品', group:'作品收藏', scope:'个人资产', source:'林屿', url:huabanMedia.posterA, previewUrl:huabanMedia.posterA, taskId:'task_0096', prompt:'竖版东方人物海报，克制留白，强调服装材质与人物轮廓，柔和自然光，高级杂志排版。', skill:'海报视觉生成', model:'Seedream 4.0', ratio:'720:1019', resolution:'1440 × 2038', fileType:'JPG', fileSize:'3.9 MB', tone:'rose', date:'昨天 18:40', creatorId:currentUserId },
  { id:'work_0095', name:'竖屏动态作品 02', description:'根据生成记录收藏的竖屏视频作品。', type:'视频作品', group:'作品收藏', scope:'个人资产', source:'林屿', url:localDemoVideos[1], previewUrl:providedImages[1], taskId:'task_0095', prompt:'竖屏构图，主体清晰，镜头自然运动，画面细节稳定。', skill:'文生视频', model:'Seedance 2.0', ...localVideoSpecs[1], fileType:'MP4', tone:'night', date:'昨天 16:22', creatorId:currentUserId },
  { id:'product_0042', name:'便携榨汁杯组合', description:'商品主图、细节图与使用场景图合集。', type:'商品图片', group:'商品资产', scope:'个人资产', source:'林屿', url:'https://assets.shulan.ai/products/product_0042', images:[huabanMedia.square,huabanMedia.posterA,huabanMedia.posterB,huabanMedia.lightA,huabanMedia.portraitXL,huabanMedia.posterC], previewUrl:huabanMedia.square, imageCount:6, resolution:'2000 × 2000', fileType:'图片集', fileSize:'28.3 MB', tone:'peach', date:'8 月 29 日', creatorId:currentUserId },
  { id:'product_0014', name:'夏季饮品礼盒', description:'包含礼盒主图、包装细节和饮用场景图。', type:'商品图片', group:'商品资产', scope:'个人资产', source:'林屿', url:'https://assets.shulan.ai/products/product_0014', images:providedImages.slice(2,8), previewUrl:providedImages[2], imageCount:6, resolution:'1152 × 2048', fileType:'图片集', fileSize:'22.6 MB', tone:'peach', date:'8 月 28 日', creatorId:currentUserId },
  { id:'team_0031', name:'品牌视觉规范 2026', description:'团队统一使用的品牌色、字体和版式规范。', type:'图片', group:'素材库', scope:'团队资产', source:'林屿', url:huabanMedia.portraitXL, previewUrl:huabanMedia.portraitXL, resolution:'2211 × 2361', ratio:'737:787', fileType:'JPG', fileSize:'5.8 MB', tone:'cobalt', date:'8 月 25 日', creatorId:currentUserId },
  { id:'team_0029', name:'团队竖屏视频 01', description:'团队共享的 AI 竖屏视频素材。', type:'视频', group:'素材库', scope:'团队资产', source:'周一鸣', url:localDemoVideos[2], previewUrl:providedImages[2], ...localVideoSpecs[2], fileType:'MP4', tone:'amber', date:'8 月 23 日', creatorId:'user_2048' },
  { id:'team_product_08', name:'团队标准商品图', description:'团队共用的商品白底图、细节图和场景图。', type:'商品图片', group:'商品资产', scope:'团队资产', source:'林屿', url:'https://assets.shulan.ai/products/team_product_08', images:[huabanMedia.posterC,huabanMedia.square,huabanMedia.posterA,huabanMedia.lightA,huabanMedia.posterB,huabanMedia.portraitXL,huabanMedia.square,huabanMedia.posterC], previewUrl:huabanMedia.posterC, imageCount:8, resolution:'1200 × 1600', fileType:'图片集', fileSize:'36.1 MB', tone:'peach', date:'8 月 22 日', creatorId:currentUserId },
  { id:'team_product_03', name:'秋季新品组合', description:'团队共享的新品主图、细节图和场景图合集。', type:'商品图片', group:'商品资产', scope:'团队资产', source:'周一鸣', url:'https://assets.shulan.ai/products/team_product_03', images:providedImages.slice(6,12), previewUrl:providedImages[6], imageCount:6, resolution:'1152 × 2048', fileType:'图片集', fileSize:'26.8 MB', tone:'peach', date:'8 月 20 日', creatorId:'user_2048' },
]

const demoImages = providedImages
const imageSpecs = [['2000 × 2000','1:1'],['2211 × 2361','737:787'],['1440 × 2038','720:1019'],['1200 × 1604','300:401'],['1200 × 1600','3:4'],['1500 × 1896','125:158']]
const imageNames = ['竖屏视觉作品 01','竖屏视觉作品 02','竖屏视觉作品 03','竖屏视觉作品 04','竖屏视觉作品 05','竖屏视觉作品 06','竖屏视觉作品 07','竖屏视觉作品 08']
const videoNames = ['竖屏动态作品 01','竖屏动态作品 02','竖屏动态作品 03','竖屏动态作品 04','竖屏动态作品 05','竖屏动态作品 06']
const productNames = ['旅行保温杯','无线桌面音箱','植物精华礼盒','轻量通勤背包','香氛蜡烛套装','家用咖啡机','户外露营灯','丝绒口红礼盒']
const reportNames = ['春季内容趋势报告','新品投放复盘','用户画像分析','短视频渠道周报','品牌搜索洞察']

const generatedAssets = Array.from({length:60},(_,index)=>{
  const sequence=index+1
  const scope=index>=40?'个人资产':index%4===0?'团队资产':'个人资产'
  const creatorId=scope==='团队资产'&&index%3===0?'user_2048':currentUserId
  const source=creatorId===currentUserId?'林屿':'周一鸣'
  const imageIndex=index%demoImages.length
  const [resolution,ratio]=['1152 × 2048','9:16']
  const common={scope,source,date:`8 月 ${19-(index%18)} 日`,creatorId}
  if(index%10===7){const images=Array.from({length:5},(_,offset)=>demoImages[(imageIndex+offset)%demoImages.length]);return {id:`product_${String(sequence+120).padStart(4,'0')}`,name:productNames[index%productNames.length],description:'包含商品主图、细节图、包装图和使用场景图。',type:'商品图片',group:'商品资产',url:`https://assets.shulan.ai/products/product_${sequence+120}`,images,previewUrl:images[0],imageCount:images.length,resolution,fileType:'图片集',fileSize:`${18+(index%12)}.6 MB`,tone:'peach',...common}}
  if(index%5===3){
    const imageCount=4+(index%5)
    const images=Array.from({length:imageCount},(_,offset)=>demoImages[(imageIndex+offset)%demoImages.length])
    return {id:`product_${String(sequence+60).padStart(4,'0')}`,name:productNames[index%productNames.length],description:'包含商品主图、卖点细节图、包装图和使用场景图。',type:'商品图片',group:'商品资产',url:`https://assets.shulan.ai/products/product_${sequence+60}`,images,previewUrl:images[0],imageCount,resolution,fileType:'图片集',fileSize:`${18+(index%16)}.4 MB`,tone:'peach',...common}
  }
  if(index%3===1){const collected=scope==='个人资产'&&index%2===1;const videoIndex=index%localDemoVideos.length;return {id:`video_${String(sequence+100).padStart(4,'0')}`,name:videoNames[index%videoNames.length],description:'AI 生成的动态视觉素材。',type:collected?'视频作品':'视频',group:collected?'作品收藏':'素材库',url:localDemoVideos[videoIndex],previewUrl:demoImages[imageIndex],taskId:`task_${String(sequence+100).padStart(4,'0')}`,prompt:'主体清晰，镜头自然运动，保留真实材质和空间层次。',skill:'文生视频',model:'Seedance 2.0',...localVideoSpecs[videoIndex],fileType:'MP4',tone:'night',...common}}
  const collected=scope==='个人资产'&&index%4===2
  return {id:`image_${String(sequence+200).padStart(4,'0')}`,name:imageNames[index%imageNames.length],description:'经过筛选整理的高清创意视觉素材。',type:collected?'图片作品':'图片',group:collected?'作品收藏':'素材库',url:demoImages[imageIndex],previewUrl:demoImages[imageIndex],taskId:`task_${String(sequence+200).padStart(4,'0')}`,prompt:'干净构图，真实材质，细腻光影，高分辨率商业视觉。',skill:'视觉生成',model:'Seedream 4.0',ratio,resolution,fileType:imageIndex===0||imageIndex===3||imageIndex===4?'PNG':'JPG',fileSize:`${2+(index%7)}.3 MB`,tone:'ocean',...common}
})

const assets = [...seedAssets,...generatedAssets]

const isVideo = item => item.type.includes('视频')
const summary = item => isVideo(item) ? `${item.ratio} · ${item.clarity} · ${item.duration}` : item.type === '营销报告' ? `PDF · ${item.pages} 页` : item.type === '商品图片' ? `${item.imageCount} 张 · ${item.resolution}` : [item.ratio,item.resolution].filter(Boolean).join(' · ')
const mediaRatio = item => {const raw=item.ratio||item.resolution; if(raw){const [width,height]=raw.split(/[:×]/).map(Number);return width/height}return item.type==='营销报告'?3/4:1}

function Thumb({ item, natural=false, playable=false }) {
  const [intrinsicRatio,setIntrinsicRatio]=useState(null)
  const [mediaFailed,setMediaFailed]=useState(false)
  const ratio=natural&&intrinsicRatio?intrinsicRatio:mediaRatio(item)
  const useEmbeddedPlayer=playable&&isVideo(item)&&item.url?.includes('vlabvod.com')
  useEffect(()=>{setIntrinsicRatio(null);setMediaFailed(false)},[item.previewUrl,item.url])
  const hideFailedMedia=()=>setMediaFailed(true)
  const readImageRatio=event=>{if(natural&&event.currentTarget.naturalHeight)setIntrinsicRatio(event.currentTarget.naturalWidth/event.currentTarget.naturalHeight)}
  return <div className={`managed-asset-thumb ${item.tone} ${natural?'natural-ratio':''} ${mediaFailed?'media-failed':''}`} style={natural?{'--media-ratio':ratio,aspectRatio:ratio}:undefined}><div className="managed-thumb-art"/>{item.previewUrl&&!mediaFailed&&<img key={item.previewUrl} src={item.previewUrl} alt="" loading={natural?'eager':'lazy'} referrerPolicy="no-referrer" onLoad={readImageRatio} onError={hideFailedMedia}/>} {useEmbeddedPlayer?<a className="video-external-preview" href={item.url} target="_blank" rel="noreferrer"><ExternalLink/>新窗口播放</a>:playable&&isVideo(item)&&!mediaFailed&&<video key={item.url} src={item.url} poster={item.previewUrl} controls playsInline preload="metadata" referrerPolicy="no-referrer" onError={hideFailedMedia}/>} {isVideo(item)&&!playable&&<i>▶</i>}</div>
}

function Sidebar({ items, scope, setScope, group, setGroup }) {
  const groups = scope === '个人资产' ? [['素材库',FolderOpen],['作品收藏',GalleryVerticalEnd],['商品资产',Package]] : [['素材库',FolderOpen],['商品资产',Package]]
  const count = name => items.filter(item => item.scope===scope && (name==='全部资产'||item.group===name)).length
  return <aside className="asset-sidebar" aria-label="资产分类"><div className="asset-sidebar-title"><Box/><strong>资产管理</strong></div><div className="scope-switch">{['个人资产','团队资产'].map(name=><button key={name} className={scope===name?'active':''} onClick={()=>{setScope(name);setGroup('全部资产')}}>{name==='个人资产'?<Box/>:<Users/>}{name}</button>)}</div><nav className="asset-tree"><button className={group==='全部资产'?'active':''} onClick={()=>setGroup('全部资产')}><LayoutGrid/><span>全部资产</span><b>{count('全部资产')}</b></button>{groups.map(([name,Icon])=><button key={name} className={group===name?'active':''} onClick={()=>setGroup(name)}><Icon/><span>{name}</span><b>{count(name)}</b></button>)}</nav><div className="asset-storage"><div><span>存储空间</span><b>2.8 GB / 20 GB</b></div><div className="asset-storage-track" role="progressbar" aria-label="存储空间使用量" aria-valuemin="0" aria-valuemax="20" aria-valuenow="2.8"><i/></div></div><div className="asset-sidebar-note"><ShieldCheck/><div><strong>{scope==='个人资产'?'仅你可管理':'团队权限'}</strong><p>{scope==='个人资产'?'发布后会在团队资产中创建副本。':'成员可查看与创建，创建者可修改与删除。'}</p></div></div></aside>
}

function MarketingAnalysis() {
  return <section className="detail-section marketing-analysis"><h3>营销分析</h3><div className="markdown-preview"><ReactMarkdown remarkPlugins={[remarkGfm]}>{marketingAnalysisMarkdown}</ReactMarkdown></div></section>
}

function Drawer({ item, onClose, onPrevious, onNext, onDelete, notify }) {
  const backdrop=useRef(null),shell=useRef(null),closeButton=useRef(null)
  const [activeImage,setActiveImage]=useState(0)
  const canManage=item.scope==='个人资产'||item.creatorId===currentUserId
  const selectedProductImage=item.images?.[activeImage]
  const selectedProductSpec=imageSpecs[demoImages.indexOf(selectedProductImage)]
  const displayedItem=item.type==='商品图片'&&selectedProductImage?{...item,previewUrl:selectedProductImage,resolution:selectedProductSpec?.[0]||item.resolution,ratio:selectedProductSpec?.[1]}:item
  const close=()=>{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return onClose();gsap.to(shell.current,{scale:.99,autoAlpha:0,duration:.18,ease:'power1.in',overwrite:true});gsap.to(backdrop.current,{autoAlpha:0,duration:.2,ease:'power1.in',onComplete:onClose,overwrite:true})}
  useLayoutEffect(()=>{const mm=gsap.matchMedia();mm.add('(prefers-reduced-motion: no-preference)',()=>{gsap.fromTo(backdrop.current,{autoAlpha:0},{autoAlpha:1,duration:.2});gsap.fromTo(shell.current,{autoAlpha:0,scale:.99},{autoAlpha:1,scale:1,duration:.3,ease:'power2.out',clearProps:'transform',onComplete:()=>closeButton.current?.focus()})});mm.add('(prefers-reduced-motion: reduce)',()=>closeButton.current?.focus());return()=>mm.revert()},[])
  useEffect(()=>{const key=e=>{if(e.key==='Escape')close();if(e.key==='ArrowUp')onPrevious();if(e.key==='ArrowDown')onNext()};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[onPrevious,onNext])
  useEffect(()=>setActiveImage(0),[item.id])
  return <div ref={backdrop} className="asset-detail-overlay" onMouseDown={e=>e.target===e.currentTarget&&close()}>
    <section ref={shell} className={`asset-detail-shell${item.type==='商品图片'?' product-detail-shell':''}`} role="dialog" aria-modal="true" aria-labelledby="asset-detail-title">
      <div className={`asset-detail-media ${item.type==='商品图片'?'product-gallery-media':''}`}><div className="asset-detail-preview"><Thumb item={displayedItem} natural playable/></div>{item.type==='商品图片'&&item.images?.length>1&&<div className="product-image-strip" aria-label="商品图片"><span>{activeImage+1} / {item.images.length}</span>{item.images.map((image,index)=><button key={`${image}-${index}`} className={activeImage===index?'active':''} onClick={()=>setActiveImage(index)} aria-label={`查看第 ${index+1} 张商品图`}><img src={image} alt="" loading="lazy" referrerPolicy="no-referrer"/></button>)}</div>}</div>
      <nav className="asset-detail-rail" aria-label="详情浏览控制"><button ref={closeButton} onClick={close} aria-label="关闭资产详情"><X/></button><div><button onClick={onPrevious} aria-label="上一个资产"><ArrowUp/></button><button onClick={onNext} aria-label="下一个资产"><ArrowDown/></button></div></nav>
      <aside className="asset-detail-copy">
        {item.group==='作品收藏'?<header className="collection-detail-header"><span>{item.group} / {item.type}</span><h2 id="asset-detail-title">{item.name}</h2><p>{item.description}</p></header>:<header><h2 id="asset-detail-title">{item.name}</h2><div className="asset-detail-meta-tags" aria-label="资产来源与归属"><span><b className={`source-avatar ${sourceAvatarColor(item.source)}`} aria-hidden="true">{item.source.slice(0,1)}</b>{item.source}</span><span><Users aria-hidden="true"/>{item.scope}</span></div></header>}
        <div className="asset-detail-copy-scroll">
          {item.group==='作品收藏'&&<><section className="detail-section"><h3>基础信息</h3><dl><div><dt>资产 ID</dt><dd><code>{item.id}</code></dd></div><div><dt>来源</dt><dd>{item.source}</dd></div><div><dt>归属</dt><dd>{item.scope}</dd></div></dl></section><section className="detail-section"><h3>关联与生成信息</h3><dl><div><dt>任务 ID</dt><dd><code>{item.taskId}</code></dd></div><div><dt>模型</dt><dd>{item.model}</dd></div><div><dt>技能</dt><dd>{item.skill}</dd></div><div className="detail-prompt"><dt>提示词</dt><dd>{item.prompt}</dd></div></dl></section><section className="detail-section"><h3>媒体属性</h3><dl><div><dt>画面比例</dt><dd>{item.ratio}</dd></div><div><dt>分辨率</dt><dd>{item.resolution}</dd></div><div><dt>文件类型</dt><dd>{item.fileType}</dd></div><div><dt>文件大小</dt><dd>{item.fileSize}</dd></div></dl></section></>}
          {item.group==='素材库'&&<><section className="detail-section"><h3>基础信息</h3><dl><div><dt>资产 ID</dt><dd><code>{item.id}</code></dd></div><div><dt>来源</dt><dd>{item.source}</dd></div><div><dt>归属</dt><dd>{item.scope}</dd></div></dl></section><section className="detail-section"><h3>媒体属性</h3><dl>{isVideo(item)?<><div><dt>画面比例</dt><dd>{item.ratio}</dd></div><div><dt>清晰度</dt><dd>{item.clarity}</dd></div><div><dt>时长</dt><dd>{item.duration}</dd></div></>:<><div><dt>画面比例</dt><dd>{item.ratio}</dd></div><div><dt>分辨率</dt><dd>{item.resolution}</dd></div></>}<div><dt>文件类型</dt><dd>{item.fileType}</dd></div><div><dt>文件大小</dt><dd>{item.fileSize}</dd></div></dl></section></>}
          {item.type==='商品图片'&&<MarketingAnalysis/>}
          {item.scope==='团队资产'&&<section className="detail-section"><h3>成员权限</h3><dl><div><dt>查看与创建</dt><dd>团队成员</dd></div><div><dt>修改与删除</dt><dd>{canManage?'你是创建者':'仅创建者'}</dd></div></dl></section>}
        </div>
        <div className="asset-detail-actions"><button onClick={()=>notify('资产已开始下载')}><Download/>下载</button><button onClick={()=>notify('已复制资产链接')}><Link2/>复制链接</button>{canManage&&<button onClick={()=>notify('已进入编辑状态')}><Pencil/>编辑</button>}{canManage&&<button className="danger-action" onClick={()=>onDelete(item)}><Trash2/>删除</button>}</div>
      </aside>
    </section>
  </div>
}

function AssetCard({ item, selected, onOpen, onToggle, notify }) {
  return <article className={`asset-card ${selected?'selected':''}`}>
    <button className="asset-open" onClick={onOpen} aria-label={`查看${item.name}详情`}/>
    <div className="asset-media"><Thumb item={item}/><button className="asset-check" onClick={onToggle} aria-label={`选择${item.name}`}>{selected&&<Check/>}</button><button className="asset-more" onClick={()=>notify(`已打开“${item.name}”操作菜单`)} aria-label={`更多操作：${item.name}`}><MoreHorizontal/></button></div>
    <div className="asset-info compact"><strong>{item.name}</strong><p><span className="asset-source-name"><b className={`source-avatar ${sourceAvatarColor(item.source)}`} aria-hidden="true">{item.source.slice(0,1)}</b>{item.source}</span><time>{item.date}</time></p></div>
  </article>
}

export default function AssetWorkspace() {
  const [assetItems,setAssetItems]=useState(assets),[scope,setScope]=useState('个人资产'),[group,setGroup]=useState('全部资产'),[query,setQuery]=useState(''),[type,setType]=useState('全部类型'),[view,setView]=useState('grid'),[selected,setSelected]=useState([]),[detail,setDetail]=useState(null),[upload,setUpload]=useState(false),[uploadFile,setUploadFile]=useState(null),[uploadError,setUploadError]=useState(''),[uploading,setUploading]=useState(false),[deleteTargets,setDeleteTargets]=useState([]),[toast,setToast]=useState('')
  const uploadCloseButton=useRef(null)
  const deleteConfirmButton=useRef(null)
  const filtered=useMemo(()=>assetItems.filter(item=>item.scope===scope&&(group==='全部资产'||item.group===group)&&(type==='全部类型'||item.type===type)&&(item.name.includes(query)||item.id.includes(query))),[assetItems,scope,group,type,query])
  const detailIndex=detail?filtered.findIndex(item=>item.id===detail.id):-1
  const showRelative=offset=>{if(!filtered.length)return;setDetail(filtered[(detailIndex+offset+filtered.length)%filtered.length])}
  const canDeleteSelection=selected.every(id=>assetItems.find(item=>item.id===id)?.creatorId===currentUserId)
  useEffect(()=>{setSelected([]);setType('全部类型');setDetail(null)},[scope])
  useEffect(()=>setType('全部类型'),[group])
  const notify=message=>{setToast(message);window.setTimeout(()=>setToast(''),2200)}
  const toggle=id=>setSelected(items=>items.includes(id)?items.filter(item=>item!==id):[...items,id])
  const types=group==='素材库'?['全部类型','图片','视频']:group==='作品收藏'?['全部类型','图片作品','视频作品']:group==='商品资产'?['商品图片']:scope==='个人资产'?['全部类型','图片','视频','图片作品','视频作品','商品图片']:['全部类型','图片','视频','商品图片']
  const typeIcons={'全部类型':LayoutGrid,'图片':Image,'视频':Film,'图片作品':GalleryVerticalEnd,'视频作品':Film,'商品图片':Package,'营销报告':FileBarChart}
  const chooseFile=event=>{const file=event.target.files?.[0];setUploadError('');setUploadFile(null);if(!file)return;const isImageFile=file.type.startsWith('image/'),isVideoFile=file.type.startsWith('video/');if(!isImageFile&&!isVideoFile)return setUploadError('仅支持图片或视频文件。');if(isImageFile&&file.size>50*1024*1024)return setUploadError('图片超过 50 MB，请压缩后重试。');if(isVideoFile&&file.size>2*1024*1024*1024)return setUploadError('视频超过 2 GB，请压缩后重试。');setUploadFile(file)}
  const submitUpload=()=>{if(!uploadFile||uploading)return;setUploading(true);window.setTimeout(()=>{const isVideoFile=uploadFile.type.startsWith('video/'),url=URL.createObjectURL(uploadFile),fileSize=uploadFile.size>=1024*1024?`${(uploadFile.size/1024/1024).toFixed(1)} MB`:`${Math.ceil(uploadFile.size/1024)} KB`;const newAsset={id:`asset_${Date.now()}`,name:uploadFile.name.replace(/\.[^.]+$/,''),description:'用户上传的资产。',type:isVideoFile?'视频':'图片',group:'素材库',scope,source:'林屿',url,previewUrl:isVideoFile?'':url,ratio:isVideoFile?'16:9':'1:1',resolution:isVideoFile?undefined:'原始尺寸',clarity:isVideoFile?'原始':undefined,duration:isVideoFile?'--:--':undefined,fileType:(uploadFile.name.split('.').pop()||'文件').toUpperCase(),fileSize,tone:isVideoFile?'night':'ocean',date:'刚刚',creatorId:currentUserId,objectUrl:url};setAssetItems(items=>[newAsset,...items]);setUploading(false);setUpload(false);setUploadFile(null);setGroup('素材库');setType(isVideoFile?'视频':'图片');notify('资产已添加到素材库')},700)}
  const closeUpload=()=>{if(uploading)return;setUpload(false);setUploadFile(null);setUploadError('')}
  const requestDelete=items=>{setDeleteTargets(Array.isArray(items)?items:[items]);setDetail(null)}
  const confirmDelete=()=>{const ids=new Set(deleteTargets.map(item=>item.id));deleteTargets.forEach(item=>item.objectUrl&&URL.revokeObjectURL(item.objectUrl));setAssetItems(items=>items.filter(item=>!ids.has(item.id)));setSelected(items=>items.filter(id=>!ids.has(id)));setDeleteTargets([]);notify(ids.size===1?'资产已删除':`已删除 ${ids.size} 项资产`)}
  useEffect(()=>{if(!upload)return;uploadCloseButton.current?.focus();const closeOnEscape=event=>{if(event.key==='Escape')closeUpload()};document.addEventListener('keydown',closeOnEscape);return()=>document.removeEventListener('keydown',closeOnEscape)},[upload,uploading])
  useEffect(()=>{if(!deleteTargets.length)return;deleteConfirmButton.current?.focus();const closeOnEscape=event=>{if(event.key==='Escape')setDeleteTargets([])};document.addEventListener('keydown',closeOnEscape);return()=>document.removeEventListener('keydown',closeOnEscape)},[deleteTargets])

  return <>
    <Sidebar items={assetItems} {...{scope,setScope,group,setGroup}}/>
    <main className="asset-main">
      <div className="asset-sticky-head">
        <header className="asset-compact-header"><div className="asset-breadcrumb">资产管理 <ChevronRight/> {scope}</div><div><h1 id="asset-page-title">{group}</h1><p>集中整理、查询和复用你的创作素材与生成作品。</p></div></header>
        <section className={`asset-toolbar ${group==='商品资产'?'without-type-tabs':''}`}>{group!=='商品资产'&&<div className="asset-type-tabs" role="group" aria-label="筛选资产类型">{types.map(name=>{const Icon=typeIcons[name];return <button key={name} className={type===name?'active':''} onClick={()=>setType(name)} aria-pressed={type===name}><Icon/>{name==='全部类型'?'全部':name}</button>})}</div>}<label className="asset-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索名称或资产 ID" aria-label="搜索资产"/>{query&&<button onClick={()=>setQuery('')} aria-label="清空搜索"><X/></button>}</label><div className="toolbar-actions"><div className="view-switch"><button className={view==='grid'?'active':''} onClick={()=>setView('grid')} aria-label="网格视图"><Grid2X2/></button><button className={view==='list'?'active':''} onClick={()=>setView('list')} aria-label="列表视图"><List/></button></div>{(group==='素材库'||group==='商品资产')&&<button className="page-primary toolbar-upload" onClick={()=>setUpload(true)}>{group==='商品资产'?<Package/>:<Upload/>}{group==='商品资产'?'添加商品':'上传资产'}</button>}</div></section>
        <div className="asset-summary"><span>共 {filtered.length} 项</span></div>
      </div>
      {filtered.length?<section className={`asset-collection ${view}`}>{filtered.map(item=><AssetCard key={item.id} item={item} selected={selected.includes(item.id)} onOpen={()=>setDetail(item)} onToggle={()=>toggle(item.id)} notify={notify}/>)}</section>:<section className="asset-empty"><Search/><h2>没有找到匹配的资产</h2><p>尝试更换关键词或筛选条件。</p><button onClick={()=>{setQuery('');setType('全部类型')}}>清除筛选</button></section>}
      {selected.length>0&&<div className="selection-bar"><span><b>{selected.length}</b> 项已选择</span>{scope==='个人资产'&&<button onClick={()=>notify('已在团队资产中创建副本，并保留来源关联')}><Users/>发布到团队</button>}{canDeleteSelection&&<button onClick={()=>requestDelete(assetItems.filter(item=>selected.includes(item.id)))}><Trash2/>删除</button>}<button className="selection-close" onClick={()=>setSelected([])} aria-label="取消选择"><X/></button></div>}
      {detail&&<Drawer item={detail} onClose={()=>setDetail(null)} onPrevious={()=>showRelative(-1)} onNext={()=>showRelative(1)} onDelete={requestDelete} notify={notify}/>}
      {upload&&<div className="dialog-backdrop" onMouseDown={e=>e.target===e.currentTarget&&closeUpload()}><section className="upload-dialog" role="dialog" aria-modal="true" aria-labelledby="upload-title"><header><div><h2 id="upload-title">上传到素材库</h2><p>支持图片与视频，上传后遵循当前资产归属权限。</p></div><button ref={uploadCloseButton} onClick={closeUpload} disabled={uploading} aria-label="关闭上传窗口"><X/></button></header><label className={`upload-drop ${uploadError?'error':''}`}><input type="file" accept="image/*,video/*" onChange={chooseFile}/><Upload/><strong>{uploadFile?.name||'选择文件上传'}</strong><span>{uploadError||'图片最大 50 MB，视频最大 2 GB'}</span></label><footer><button className="cancel" onClick={closeUpload} disabled={uploading}>取消</button><button className="confirm" onClick={submitUpload} disabled={!uploadFile||uploading}>{uploading?'上传中…':'添加资产'}</button></footer></section></div>}
      {deleteTargets.length>0&&<div className="dialog-backdrop" onMouseDown={event=>event.target===event.currentTarget&&setDeleteTargets([])}><section className="upload-dialog delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description"><header><div><h2 id="delete-title">确认删除资产？</h2><p id="delete-description">{deleteTargets.length===1?`“${deleteTargets[0].name}”将从资产列表中删除。`:`所选 ${deleteTargets.length} 项资产将从列表中删除。`}</p></div><button onClick={()=>setDeleteTargets([])} aria-label="关闭删除确认"><X/></button></header><footer><button className="cancel" onClick={()=>setDeleteTargets([])}>取消</button><button ref={deleteConfirmButton} className="confirm danger-confirm" onClick={confirmDelete}><Trash2/>确认删除</button></footer></section></div>}
      {toast&&<div className="asset-toast" role="status"><Check/>{toast}</div>}
    </main>
  </>
}
