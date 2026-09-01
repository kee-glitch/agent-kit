# 思源黑体网页字体

项目本地托管 Adobe Source Han Sans 2.005 简体中文版可变字体，并按字符范围加载：

- `SourceHanSansSC-VF-base.woff2`：拉丁字母、数字、标点和基础符号，约 156 KB。
- `SourceHanSansSC-VF-common.woff2`：GB2312 常用简体中文，约 3.1 MB。
- `SourceHanSansSC-VF.ttf.woff2`：完整扩展字库，仅出现生僻字时加载，约 13.5 MB。

字体家族名为 `Source Han Sans SC VF`，支持 `200–900` 可变字重。精确的 `unicode-range` 声明位于 `src/source-han-sans.css`，由 `scripts/subset-source-han.py` 生成；使用 `--force` 可重新裁剪已有分片。

授权文件保存在 `source-han-sans/LICENSE.txt`；字体加载失败时回退到微软雅黑和系统无衬线字体。
