# DSH Agentero 批注阅读增强

为 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai/deepseek-harness) 中的 [Agentero](https://github.com/poco-ai/agentero-dsh-plugin) PDF阅读器增加完整文字批注栏。

Agentero负责文献库、PDF和阅读标注，DSH提供对话与插件界面。本插件让PDF里的文字评论能够在可视区域中完整阅读，并支持按页筛选、搜索和页码跳转。

## 解决什么问题

Agentero DSH 0.1.5将评论卡片放在PDF页面右边界之外。采用默认“适应宽度”时，PDF占用了阅读区，评论容易落到视口外，出现高亮和下划线可见、文字评论看不到的情况。

本插件将评论放进独立、可折叠的栏中。宽阅读区域与PDF并排，窄区域使用可关闭的侧栏浮层。长评论可以全文滚动、选择和复制。

## 功能

|功能|说明|
|---|---|
|完整文字评论|显示多行及长评论，评论列表独立滚动|
|当前页与整篇|按当前阅读页查看，也可以查看整篇论文|
|全文搜索|按评论内容筛选|
|页码跳转|点击评论的页码，定位对应PDF页面|
|PDF原生评论|通过阅读器PDF引擎读取内嵌文字评论|
|Agentero标注|读取已有位置索引，与PDF评论合并去重|
|保留阅读功能|继续使用原有划词、高亮、搜索、书签和翻译|
|可停用|通过DSH插件管理启停，沿用原文献库|

本插件读取Agentero已配置的知识库，不调用模型。Zotero自身保存在数据库里的批注，需要先导入Agentero或导出为带批注的PDF。

## 已验证环境

|组件|版本|
|---|---|
|DeepSeek Harness|0.2.2-rc.1|
|Agentero DSH|0.1.5|
|Node.js|24.22.2，最低要求24.9|
|构建器|esbuild 0.28.2|
|运行界面|DSH web profile，Chrome 156|

已在真实DSH页面验证2042字长评论、当前页与整篇切换、搜索、点击页码跳转、收起与展开，以及宽窄阅读布局。单独屏蔽位置索引响应时，阅读器仍能从PDF中读取文字评论。

## 安装

### 1. 准备Agentero

安装Agentero DSH插件，并在DSH中配置自己的文献库：

```bash
dsh plugin --profile web add @poco-ai/agentero-dsh
```

### 2. 下载并构建本插件

```bash
git clone https://github.com/yellkiin/dsh-agentero-annotations.git
cd dsh-agentero-annotations
npm install --legacy-peer-deps
npm run build
```

构建时从固定提交下载上游阅读器，使用本机DSH profile中的阅读器依赖。Node.js与系统 `tar` 命令需要可用，构建期间需要访问GitHub。

默认依赖目录为 `$HOME/.dsh/profiles/web/node_modules`。使用其他profile或自定义DSH目录时，指定实际位置，例如：

```bash
DSH_PROFILE_NODE_MODULES="$HOME/.dsh/profiles/my-profile/node_modules" npm run build
```

### 3. 安装到DSH

```bash
node install.mjs --profile web
```

刷新DSH网页，重新打开论文，点击上方“文字批注”展开或收起。插件管理页可以查看启用状态，并按界面提示刷新或重启。

这是一份本地构建的DSH组合插件。GitHub源码下载完成后，先执行构建，再安装。

## 使用

1. 从Agentero文献库打开论文。
2. 展开“文字批注”栏。
3. 选择“当前页”或“整篇”。
4. 输入关键词筛选评论，点击页码跳转。
5. 需要更多PDF空间时收起批注栏，或将DSH阅读区域切换为全屏。

PDF内嵌评论按两页一批读取，与Agentero已有评论按页码和正文去重。文字内容保持在本机文献库。

## 迁移与更新

迁移时，将Agentero文献库一并复制或同步到新机器，在新DSH环境中重新配置该知识库，再按上述步骤构建、安装插件。插件从Agentero现行配置读取文献位置。

更新源码后执行：

```bash
git pull
npm install --legacy-peer-deps
npm run build
node install.mjs --profile web
```

不使用时在DSH插件管理中停用 `dsh-agentero-annotations`。公开仓库及源码发行包不包含个人文献、批注正文、会话或账号。

## 实现与目录

使用DSH的 `dsh.bundle`、`dsh.client`、Cordis生命周期和公开的 `sidebar.right.pane.tab` 槽位。在 `agentero-dsh-pdf` 键上提供优先级为-100的增强页体，复用Agentero的数据接口与文献入口。

```text
src/annotations-panel.tsx   批注栏与筛选交互
src/reader-patch.json       阅读器增强补丁
src/style.css              宽窄布局
scripts/prepare-reader.mjs  获取固定版本阅读器并应用补丁
build.mjs                  构建DSH浏览器模块
install.mjs                本机打包和安装
cordis.patch.yml           DSH组合包声明
```

`src/reader/`、`.upstream/` 和 `lib/` 由本机构建生成。

## 来源与许可证

新增代码与补丁采用 [MIT许可证](LICENSE)。上游阅读器的来源与本机构建方式见 [NOTICE.md](NOTICE.md)。本仓库和源码发行包只发布新增代码与补丁。

相关项目：[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)、[Agentero DSH](https://github.com/poco-ai/agentero-dsh-plugin)、[EmbedPDF](https://github.com/embedpdf/embed-pdf-viewer)。
