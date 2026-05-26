# 答题免费 AI 助手 (Answer Free AI Assistant)

> 一款 Chrome/Edge 浏览器插件，帮助你在网页上抓取题目，通过 AI 解析答案，支持复习复盘和导出。

[English](README.md) · [简体中文](README.zh-CN.md)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Manifest V3](https://img.shields.io/badge/manifest-v3-green.svg)

## 功能特性

### 核心流程
- **网页抓题** — 一键抓取当前页面题目内容，智能过滤导航、按钮等噪音 DOM
- **解除限制** — 解除 `user-select: none`、禁止右键、禁止复制等页面限制
- **AI 解析** — 将题目内容发送给 AI 模型（支持 DeepSeek、OpenAI、本地模型等），返回结构化答案
- **结果展示** — 结构化展示解析结果：题型、题干、选项、答案、代码（多语言）、讲解

### 支持题型
| 题型 | 说明 |
|---|---|
| 单选题 | 自动提取正确选项及解析 |
| 多选题 | 列出所有正确选项并逐一分析 |
| 判断题 | 判断结果 + 判断依据 |
| 填空题 | 正确答案 + 解题过程 |
| 简答题 | 简明答案 + 详细展开 |
| 编程题 | 完整可运行代码（可配置语言）+ 复杂度分析 |
| 主观题 | 送分题/评价题灵活处理 |

### 模型管理
- **多模型支持** — 可配置多个 AI 模型（DeepSeek、OpenAI、本地模型等）
- **自定义 Token 限制** — 每个模型独立配置 `maxTokens`（默认 100,000）
- **JSON 导入** — 支持从 JSON 批量导入模型配置
- **默认模型** — 可设置默认模型快速切换
- **模型记忆** — 自动记住上次使用的模型

### 讲题配置
- **开关控制** — 全局开启/关闭讲解功能
- **5 种讲题风格** — 严谨型、通俗型、启发型、精简型、详细型
- **6 个讲解模块** — 题干分析、考点定位、解题步骤、易错提醒、知识点总结、同类题技巧
- **动态注入** — 讲解配置实时注入到系统 Prompt 中

### 代码语言
- **12 种语言** — Java、Python、C++、JavaScript、Go、Rust、TypeScript、Kotlin、Ruby、Swift、C#、C
- **默认：Java、Python、C++** — 可在设置中自定义
- **代码标签切换** — 编程题结果中可切换不同语言查看

### 个性化设置
- **Prompt 模板** — 可编辑系统提示词，支持恢复默认
- **深色/浅色主题** — 完整主题切换，带平滑过渡
- **功能开关** — 解除限制功能可随时开关

### 历史记录与导出
- **持久化存储** — 所有解析记录保存在 `chrome.storage.local`
- **展开/收起** — 点击查看每题的详细解析
- **三种导出格式** — TXT、Markdown、JSON
- **灵活导出范围** — 全部记录、已选记录、当前记录
- **自动时间戳文件名** — 导出文件名包含日期时间

### 界面体验
- **侧边栏界面** — 4 个标签页：抓题、历史、导出、设置
- **快捷弹窗** — 抓题按钮、最近记录预览
- **加载动画** — 加载遮罩带进度提示
- **错误提示** — 友好的错误信息，可关闭
- **JSON 解析容错** — 多策略 JSON 提取（代码块、标签、花括号匹配）

## 技术栈

- **Vue 3** — 响应式 UI 框架
- **Vite** — 快速的多入口构建系统
- **Manifest V3** — 最新的 Chrome 扩展架构
- **`chrome.storage.local`** — 数据全部本地持久化
- **OpenAI 兼容 API** — 支持 DeepSeek、OpenAI、LM Studio 等

## 项目结构

```
ai-study-assistant/
├── manifest.json                          # 扩展清单 (MV3)
── package.json                           # 依赖 & 构建脚本
├── vite.config.mjs                        # Vite 多入口配置
├── public/
│   └── icons/                             # 插件图标 (16/48/128)
├── src/
│   ├── background.js                      # Service Worker（侧面板注册、消息转发）
│   ├── content/
│   │   └── content.js                     # 内容脚本（抓题、解除限制）
│   ├── popup/
│   │   ├── index.html / main.js / App.vue
│   │   └── components/                    # Popup 组件
│   ├── sidepanel/
│   │   ├── index.html / main.js / App.vue
│   │   ├── views/
│   │   │   ├── CaptureView.vue            # 抓题 + AI 解析
│   │   │   ├── HistoryView.vue            # 历史记录
│   │   │   ├── ExportView.vue             # 导出记录
│   │   │   ── SettingsView.vue           # 设置中心
│   │   └── components/
│   │       ├── ModelSelector.vue          # 模型选择器
│   │       ├── ResultViewer.vue           # 结构化结果展示
│   │       └── LoadingOverlay.vue         # 加载动画
│   ├── shared/
│   │   ├── api.js                         # AI API 客户端（OpenAI 兼容格式）
│   │   ├── storage.js                     # chrome.storage 封装 + CRUD
│   │   └── utils.js                       # 分块、解析、导出格式化
│   ── styles/
│       └── global.css                     # 设计 Token、主题变量
── dist/                                  # 构建产物（直接加载到 Chrome）
```

## 快速开始

### 前置条件
- Node.js 18+
- npm 或 pnpm

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev        # 监听模式，文件变更后自动重新构建
```

### 生产构建
```bash
npm run build      # 构建到 dist/ 目录
```

### 加载到 Chrome
1. 打开 `chrome://extensions/`
2. 开启右上角的 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择 `dist/` 目录
5. 固定插件即可使用！

### 更新代码后
- 运行 `npm run build` 重新构建
- 在 `chrome://extensions/` 中找到插件，点击 **刷新** 图标

## 配置说明

### 添加 AI 模型
1. 打开插件 → 设置 → 模型配置
2. 点击 **+ 新增** 或 **JSON 导入**
3. 填写：名称、API 地址、API 密钥、模型名称、最大 Token 数
4. 可设为默认模型

**常用 API 地址：**
| 服务商 | API 地址 |
|---|---|
| DeepSeek | `https://api.deepseek.com/v1` |
| OpenAI | `https://api.openai.com/v1` |
| LM Studio | `http://localhost:1234/v1` |

## 数据隐私

所有数据（模型配置、历史记录、设置项）均存储在浏览器本地 `chrome.storage.local` 中。除了你主动配置的 AI API 请求外，不会向任何服务器发送数据。

## 许可证

MIT

---

基于 [Vue 3](https://vuejs.org/) + [Vite](https://vitejs.dev/) 构建
