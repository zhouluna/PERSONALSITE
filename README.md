# LUNA BYTEBUN

LUNA BYTEBUN 的个人站。首页的机器猫和机器兔由物理公式组成：公式先散在页面上，再聚成两只的轮廓，然后再次散开。点猫或兔子可以聊天。

## 页面

- **首页**：公式聚成猫和兔子。鼠标移动时它们会轻轻跟着偏。点左边和机器猫聊天，点右边和机器兔聊天。
- **News**：GitHub 当天新建且星标最高的仓库（默认关键词 AI，账号 [zhouluna](https://github.com/zhouluna)）、X 上的技术入口和自己收藏的链接、Hacker News 的 AI 新闻、SAP News 里可筛 ABAP 相关条目。
- **YouTube**：AI、AI+硬件、AI+软件三类视频。每类用多组关键词搜索，按出现次数再按点赞排序；出现在两组及以上的标成被反复推荐。需要服务器环境变量 `YOUTUBE_API_KEY`（YouTube Data API v3）。
- **Bilibili**：同一套分类和排序。公开搜索按收藏取候选，再用返回的点赞数排序，不需要登录。
- **Personal**：笔记支持 Markdown、粘贴图片和上传文件。填写 GitHub 仓库和 token 后，可以把笔记写成仓库里的 Markdown 并得到查看链接。Learning hub 按分类收集网站和书。
- **Tools**：按板块和更细的分类收藏链接，可以搜索。目录在 `src/lib/tools-catalog.json`。
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

API Key 和 GitHub token 只保存在这台浏览器里，不会写入仓库。YouTube 推荐页另读服务器环境变量 `YOUTUBE_API_KEY`，密钥不要写进仓库或前端代码；没配时页面会说明原因，不会编造视频。笔记、学习清单和上传的文件在本机 `data/` 目录，这个目录不进入 Git。工具目录提交在仓库里，部署后也能读到。线上文件系统是只读的，所以网站上的加入和删除不会改那份目录。本机加入或删除会写进 `data/store.json`，之后以那份文件为准。

## 技术

Next.js、React 19，界面基于 [Astryx](https://github.com/meta/astryx)。
