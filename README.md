# LUNA BYTEBUN

LUNA BYTEBUN 的个人站。首页的机器猫和机器兔由物理公式组成：公式先散在页面上，再聚成两只的轮廓，然后再次散开。点猫或兔子可以聊天。

## 页面

- **首页**：公式聚成猫和兔子。鼠标移动时它们会轻轻跟着偏。点左边和机器猫聊天，点右边和机器兔聊天。
- **News**：GitHub 当天新建且星标最高的仓库（默认关键词 AI，账号 [zhouluna](https://github.com/zhouluna)）、X 上的技术入口和自己收藏的链接、Hacker News 的 AI 新闻、SAP News 里可筛 ABAP 相关条目。
- **Personal**：笔记支持 Markdown、粘贴图片和上传文件。填写 GitHub 仓库和 token 后，可以把笔记写成仓库里的 Markdown 并得到查看链接。Learning hub 按分类收集网站和书。
- **Tools**：按分类收藏工具。
- **模型**：端点台原来的目录、对话和多模型聊天，以及猫和兔子各自使用的模型。

## 本地运行

需要 Node.js 22 或更高版本。

```bash
npm install
npm run dev
```

浏览器打开 [http://localhost:3460](http://localhost:3460)。

## 配置

模型页默认连接 [端点台](https://endpoint-desk-luna.vercel.app/chat)。NVIDIA API Key 从 [build.nvidia.com/settings](https://build.nvidia.com/settings) 获取。

API Key 和 GitHub token 只保存在这台浏览器里，不会写入仓库。笔记、学习清单、工具收藏和上传的文件在本机 `data/` 目录，这个目录也不进入 Git。

## 技术

Next.js、React 19，界面基于 [Astryx](https://github.com/meta/astryx)。
