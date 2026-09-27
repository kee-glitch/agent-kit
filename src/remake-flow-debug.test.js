import test from "node:test";
import assert from "node:assert/strict";
import { createReplacementAssetsSnapshot, createReplacementResultLog, createVideoBreakdownLog, logRemakeFlow } from "./remake-flow-debug.js";

test("复刻流程以折叠分组打印模式、操作及输入输出参数", () => {
  const calls = [];
  const logger = {
    groupCollapsed: (...args) => calls.push(["group", ...args]),
    log: (...args) => calls.push(["log", ...args]),
    groupEnd: () => calls.push(["end"]),
  };

  logRemakeFlow("structure", 3, "提取片段", { storyboard: "故事面板" }, { segments: [1, 2, 3] }, true, logger);

  assert.deepEqual(calls, [
    ["group", "[结构仿写 / STEP 03 / 提取片段]"],
    ["log", "Input\n{\n  \"storyboard\": \"故事面板\"\n}"],
    ["log", "Output\n{\n  \"segments\": [\n    1,\n    2,\n    3\n  ]\n}"],
    ["end"],
  ]);
});

test("正式环境不打印复刻流程参数", () => {
  const calls = [];
  const logger = { groupCollapsed: () => calls.push(1), log: () => calls.push(1), groupEnd: () => calls.push(1) };
  logRemakeFlow("element", 2, "生成结果", {}, {}, false, logger);
  assert.deepEqual(calls, []);
});

test("视频拆解日志包含技能、框架结果和脚本资源", () => {
  const breakdown = [
    "## 01｜视频定位",
    "定位内容",
    "## 02｜脚本资源",
    "* 【人物1】：青年男性",
    "* 【产品1】：黑色产品罐",
    "## 03｜转化逻辑",
    "转化内容",
  ].join("\n\n");

  const scriptResources = [
    { id: "person", title: "人物1" },
    { id: "product-detail", title: "产品1-单粒特写" },
  ];
  assert.deepEqual(createVideoBreakdownLog({
    videoName: "demo.mp4",
    videoPath: "/demo.mp4",
    model: "seedance 2.0",
    aspectRatio: "9:16",
    breakdown,
    storyboardImages: ["/original-1.jpg", "/original-2.jpg"],
    scriptResources,
  }), {
    input: {
      videoName: "demo.mp4",
      videoPath: "/demo.mp4",
      model: "seedance 2.0",
      aspectRatio: "9:16",
      技能: ["视频拆解prompt", "逐秒分镜15秒技能"],
    },
    output: {
      视频拆解与复刻框架: breakdown,
      脚本资源: scriptResources.map((resource) => ({ ...resource, role: null })),
      原视频逐秒分镜图片: ["/original-1.jpg", "/original-2.jpg"],
    },
  });
});

test("替换素材状态 JSON 合并槽位状态且不输出图片预览", () => {
  const resources = [
    { id: "person", type: "person", role: "图片1", title: "人物1", description: "人物说明" },
    { id: "product", type: "product", role: "图片2", title: "产品1", description: "产品说明" },
  ];
  const assets = [
    { id: "asset-1", sourceId: "person", type: "image", role: "图片1", name: "person.jpg", preview: "data:image/jpeg;base64,large" },
    { id: "asset-2", type: "video", role: "视频1", name: "extra.mp4", preview: "data:video/mp4;base64,large" },
  ];

  assert.deepEqual(createReplacementAssetsSnapshot(resources, assets), {
    替换素材: [
      {
        ...resources[0],
        status: "uploaded",
        file: { id: "asset-1", name: "person.jpg", type: "image", role: "图片1", sourceId: "person" },
      },
      { ...resources[1], role: null, status: "empty", file: null },
      {
        id: "asset-2",
        type: "video",
        role: "视频1",
        title: "extra.mp4",
        description: "其他素材",
        status: "uploaded",
        file: { id: "asset-2", name: "extra.mp4", type: "video", role: "视频1", sourceId: null },
      },
    ],
  });
});

test("替换结果日志按每张分镜拆分并单列故事面板输入输出", () => {
  const 引用素材 = {
    图片1: { type: "image", url: "https://cdn.example.com/person.webp" },
    图片2: { type: "image", url: "./product.png" },
    图片3: { type: "image", url: "[本地图片数据]" },
  };
  assert.deepEqual(createReplacementResultLog({
    originalImages: ["original-1.jpg", "original-2.jpg", "original-3.jpg"],
    replacedImages: ["replaced-1.png", "replaced-2.png", "replaced-3.png"],
    request: "[人物1]替换成@图片1",
    breakdown: "视频拆解框架",
    storyboard: "替换后的故事面板正文",
    assets: [
      { role: "图片1", type: "image", url: "https://cdn.example.com/person.webp" },
      { role: "图片2", type: "image", path: "./product.png" },
      { role: "图片3", type: "image", preview: "data:image/png;base64,very-large-content" },
    ],
  }), {
    逐秒分镜对照: [
      {
        input: { 原视频分镜图片: "original-1.jpg", 替换需求: "[人物1]替换成@图片1", 引用素材, 技能: "图片元素替换技能" },
        output: { 替换后分镜图片: "replaced-1.png" },
      },
      {
        input: { 原视频分镜图片: "original-2.jpg", 替换需求: "[人物1]替换成@图片1", 引用素材, 技能: "图片元素替换技能" },
        output: { 替换后分镜图片: "replaced-2.png" },
      },
      {
        input: { 原视频分镜图片: "original-3.jpg", 替换需求: "[人物1]替换成@图片1", 引用素材, 技能: "图片元素替换技能" },
        output: { 替换后分镜图片: "replaced-3.png" },
      },
    ],
    替换后的故事面板: {
      input: { 替换需求: "[人物1]替换成@图片1", 引用素材, 视频拆解与复刻框架: "视频拆解框架", 技能: "故事面板技能" },
      output: {
        替换后的故事面板: {
          content: "替换后的故事面板正文",
          引用素材,
        },
      },
    },
  });
});
