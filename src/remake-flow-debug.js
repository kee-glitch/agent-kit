const modeLabels = {
  element: "元素替换",
  rewrite: "原片仿写",
  structure: "结构仿写",
};

function extractMarkdownSection(markdown, heading) {
  const marker = `## ${heading}`;
  const start = markdown.indexOf(marker);
  if (start < 0) return "";
  const contentStart = start + marker.length;
  const remaining = markdown.slice(contentStart).replace(/^\s+/, "");
  const nextHeading = remaining.search(/\r?\n##\s/u);
  return (nextHeading < 0 ? remaining : remaining.slice(0, nextHeading)).trim();
}

export function createVideoBreakdownLog({
  videoName,
  videoPath,
  model,
  aspectRatio,
  quality,
  breakdown,
  scriptResources,
  storyboardImages,
}) {
  const loggedResources = Array.isArray(scriptResources)
    ? scriptResources.map((resource) => ({ ...resource, role: null }))
    : extractMarkdownSection(breakdown, "02｜脚本资源");
  return {
    input: {
      videoName,
      videoPath,
      model,
      aspectRatio,
      ...(quality ? { quality } : {}),
      技能: ["视频拆解prompt", "逐秒分镜15秒技能"],
    },
    output: {
      视频拆解与复刻框架: breakdown,
      脚本资源: loggedResources,
      原视频逐秒分镜图片: storyboardImages,
    },
  };
}

export function createReplacementResultLog({
  originalImages,
  replacedImages,
  request,
  breakdown,
  storyboard,
  assets = [],
}) {
  const referenceAssets = Object.fromEntries(
    assets.flatMap((asset) => {
      const address = asset.url || asset.path || asset.preview;
      return typeof asset.role === "string" && typeof address === "string"
        ? [[asset.role, {
            type: asset.type || "image",
            url: address.startsWith("data:") ? "[本地图片数据]" : address,
          }]]
        : [];
    }),
  );
  return {
    逐秒分镜对照: originalImages.map((originalImage, index) => ({
      input: {
        原视频分镜图片: originalImage,
        替换需求: request,
        引用素材: referenceAssets,
        技能: "图片元素替换技能",
      },
      output: {
        替换后分镜图片: replacedImages[index],
      },
    })),
    替换后的故事面板: {
      input: {
        替换需求: request,
        引用素材: referenceAssets,
        视频拆解与复刻框架: breakdown,
        技能: "故事面板技能",
      },
      output: {
        替换后的故事面板: {
          content: storyboard,
          引用素材: referenceAssets,
        },
      },
    },
  };
}

export function createReplacementAssetsSnapshot(resources, assets) {
  const toFile = (asset) => asset ? {
    id: asset.id,
    name: asset.name,
    type: asset.type,
    role: asset.role,
    sourceId: asset.sourceId ?? null,
  } : null;
  const bound = resources.map((resource) => {
    const asset = assets.find((item) => item.sourceId === resource.id);
    return {
      ...resource,
      role: asset?.role ?? null,
      status: asset ? "uploaded" : "empty",
      file: toFile(asset),
    };
  });
  const additional = assets
    .filter((asset) => !asset.sourceId)
    .map((asset) => ({
      id: asset.id,
      type: asset.type,
      role: asset.role,
      title: asset.name,
      description: "其他素材",
      status: "uploaded",
      file: toFile(asset),
    }));
  return { 替换素材: [...bound, ...additional] };
}

export function logRemakeFlow(
  mode,
  step,
  operation,
  input,
  output,
  enabled = import.meta.env?.DEV,
  logger = console,
) {
  if (!enabled) return;
  logger.groupCollapsed(`[${modeLabels[mode] || mode} / STEP ${String(step).padStart(2, "0")} / ${operation}]`);
  if (output === undefined) {
    logger.log(`Input / Output\n${JSON.stringify(input, null, 2)}`);
    logger.groupEnd();
    return;
  }
  logger.log(`Input\n${JSON.stringify(input, null, 2)}`);
  logger.log(`Output\n${JSON.stringify(output, null, 2)}`);
  logger.groupEnd();
}
