# Answer Free AI Assistant (答题免费 AI 助手)

> A Chrome/Edge browser extension for AI-assisted learning — capture questions from any webpage, parse them with AI, review answers, and export for study.

[简体中文](README.zh-CN.md) · [English](README.md)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Manifest V3](https://img.shields.io/badge/manifest-v3-green.svg)

## Features

### Core Workflow
- **Webpage Capture** — One-click extraction of question content from any webpage, with smart DOM filtering to remove navigation, buttons, and noise
- **Remove Restrictions** — Bypass `user-select: none`, copy-disabled, and right-click-blocked pages
- **AI Parsing** — Send captured content to any OpenAI-compatible API (DeepSeek, OpenAI, LM Studio, etc.) for structured answer parsing
- **Result Viewer** — Beautifully rendered structured results: question type, content, options, answer, code (multi-language), and detailed explanation

### Question Types Supported
| Type | Description |
|---|---|
| Single Choice | Auto-extracts correct option with reasoning |
| Multiple Choice | Lists all correct options with analysis |
| True/False | Judgment with explanation |
| Fill-in-the-Blank | Correct answer with solving process |
| Short Answer | Concise answer with detailed explanation |
| Programming | Full runnable code in configured languages + complexity analysis |
| Subjective | Free-response question handling |

### Model Management
- **Multi-model Support** — Configure unlimited AI models (DeepSeek, OpenAI, local models)
- **Per-model Token Limit** — Customizable `maxTokens` per model (default 100,000)
- **JSON Import** — Bulk import model configs from JSON
- **Default Model** — Set a default model for quick switching
- **Active Model Memory** — Remembers last used model

### Explanation System
- **Toggle On/Off** — Enable or disable detailed explanations globally
- **5 Teaching Styles** — Rigorous, Conversational, Guided, Concise, Detailed
- **6 Content Sections** — Question Analysis, Key Point, Steps, Common Mistakes, Summary, Similar Problems
- **Dynamic Prompt Injection** — Teaching config is dynamically injected into the system prompt

### Code Languages
- **12 Languages** — Java, Python, C++, JavaScript, Go, Rust, TypeScript, Kotlin, Ruby, Swift, C#, C
- **Default: Java, Python, C++** — Customizable in settings
- **Per-question Code Tabs** — Switch between languages in result viewer

### Customization
- **Prompt Template** — Editable system prompt with restore-to-default
- **Dark/Light Theme** — Full theme support with smooth transitions
- **Feature Toggles** — Restriction removal can be enabled/disabled

### History & Export
- **Persistent History** — All parsing sessions saved in `chrome.storage.local`
- **Expand/Collapse** — Detailed view with question-by-question breakdown
- **Export Formats** — TXT, Markdown, JSON
- **Export Scope** — All records, selected records, or current session
- **Timestamped Filenames** — Auto-generated filenames with date/time

### UI/UX
- **Side Panel Interface** — 4-tab navigation: Capture, History, Export, Settings
- **Popup Quick Actions** — Capture button, recent history preview
- **Loading States** — Animated loading overlay with progress messages
- **Error Handling** — Friendly error messages with dismissible alerts
- **JSON Parse Fallback** — Multi-strategy JSON extraction (code blocks, tags, brace matching)

## Tech Stack

- **Vue 3** — Reactive UI framework
- **Vite** — Fast multi-entry build system
- **Manifest V3** — Latest Chrome extension architecture
- **`chrome.storage.local`** — All data persisted locally
- **OpenAI-compatible API** — Works with DeepSeek, OpenAI, LM Studio, etc.

## Project Structure

```
ai-study-assistant/
├── manifest.json                          # Extension manifest (MV3)
├── package.json                           # Dependencies & scripts
├── vite.config.mjs                        # Vite multi-entry config
── public/
│   └── icons/                             # Extension icons (16/48/128)
├── src/
│   ├── background.js                      # Service Worker (side panel, messaging)
│   ├── content/
│   │   └── content.js                     # Content script (capture, restriction removal)
│   ├── popup/
│   │   ├── index.html / main.js / App.vue
│   │   └── components/                    # Popup components
│   ├── sidepanel/
│   │   ├── index.html / main.js / App.vue
│   │   ├── views/
│   │   │   ├── CaptureView.vue            # Capture + AI parsing
│   │   │   ├── HistoryView.vue            # Record history
│   │   │   ├── ExportView.vue             # Export records
│   │   │   └── SettingsView.vue           # Settings center
│   │   └── components/
│   │       ├── ModelSelector.vue          # Model picker
│   │       ├── ResultViewer.vue           # Structured results
│   │       └── LoadingOverlay.vue         # Loading animation
│   ├── shared/
│   │   ├── api.js                         # AI API client (OpenAI compatible)
│   │   ├── storage.js                     # chrome.storage wrapper + CRUD
│   │   └── utils.js                       # Chunking, parsing, export formatters
│   └── styles/
│       └── global.css                     # Design tokens, theme variables
└── dist/                                  # Build output (load this into Chrome)
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Install Dependencies
```bash
npm install
```

### Development
```bash
npm run dev        # Watch mode, auto-rebuild on changes
```

### Build
```bash
npm run build      # Production build → dist/
```

### Load in Chrome
1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `dist/` directory
5. Pin the extension and enjoy!

### Update After Changes
- Run `npm run build` to rebuild
- Go to `chrome://extensions/` and click the **refresh** icon on the extension card

## Configuration

### Adding an AI Model
1. Open extension → Settings → Model Config
2. Click **+ Add** or **JSON Import**
3. Fill in: Name, API URL, API Key, Model Name, Max Tokens
4. Set as default if needed

**Example API configs:**
| Provider | API URL |
|---|---|
| DeepSeek | `https://api.deepseek.com/v1` |
| OpenAI | `https://api.openai.com/v1` |
| LM Studio | `http://localhost:1234/v1` |

## Data Privacy

All data (model configs, history, settings) is stored locally in `chrome.storage.local`. Nothing is sent to any server except the API requests you configure.

## License

MIT

---

Built with [Vue 3](https://vuejs.org/) + [Vite](https://vitejs.dev/)
