// Content script - page content extraction and text selection assist
(function () {
if (window.__aiStudyAssistantContentLoaded) {
  return;
}
window.__aiStudyAssistantContentLoaded = true;

// Remove page restrictions
function removeRestrictions() {
  // Remove user-select: none
  const style = document.createElement('style');
  style.id = 'ai-study-override';
  style.textContent = `
    *, *::before, *::after {
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
      user-select: text !important;
      -webkit-touch-callout: default !important;
    }
  `;
  document.head.appendChild(style);

  // Remove copy/drag restrictions
  document.addEventListener('copy', e => e.stopPropagation(), true);
  document.addEventListener('cut', e => e.stopPropagation(), true);
  document.addEventListener('contextmenu', e => e.stopPropagation(), true);

  // Remove onselectstart/oncopy/oncut listeners
  const events = ['selectstart', 'copy', 'cut', 'dragstart', 'drag', 'keydown', 'keyup'];
  events.forEach(evt => {
    document.addEventListener(evt, e => {
      if (!(e.target instanceof Element)) return;
      const handler = e.target.getAttribute(`on${evt}`);
      if (handler && (handler.includes('return false') || handler.includes('preventDefault'))) {
        e.stopPropagation();
      }
    }, true);
  });
}

// Smart page content extraction
function extractPageContent() {
  const host = window.location.hostname;

  // LeetCode specific
  if (host.includes('leetcode') || host.includes('leetcode.cn')) {
    return extractLeetCodeContent();
  }

  // Course/assessment page specific (detect by common patterns)
  if (detectCoursePage()) {
    return extractCourseContent();
  }

  // Generic extraction for other pages
  return extractGenericContent();
}

// Detect if this is a course/assessment page
function detectCoursePage() {
  const text = document.body.innerText || '';
  return text.includes('单选题') || text.includes('多选题') || text.includes('判断题') || text.includes('课程评估');
}

// Extract course/assessment page content - focus on question area only
function extractCourseContent() {
  const lang = detectProgrammingLanguage();

  // Try to find the main question container
  const mainSelectors = [
    '[class*="question"]', '[class*="Question"]',
    '[class*="assessment"]', '[class*="Assessment"]',
    '[class*="exam"]', '[class*="Exam"]',
    '[class*="quiz"]', '[class*="Quiz"]',
    'main', '[role="main"]',
  ];

  let targetElement = null;
  for (const sel of mainSelectors) {
    const el = document.querySelector(sel);
    if (el && el.innerText.trim().length > 50) {
      targetElement = el;
      break;
    }
  }

  if (!targetElement) {
    return extractGenericContent(lang);
  }

  const clone = targetElement.cloneNode(true);

  // Remove noise within the question area
  const noiseSelectors = [
    'script', 'style',
    'nav', 'header', 'footer', 'aside',
    '.nav', '.header', '.footer', '.sidebar', '.menu',
    '.breadcrumb', '.pagination',
    'button', '.btn', '[role="button"]',
    'svg', 'img',
  ];
  noiseSelectors.forEach(sel => {
    clone.querySelectorAll(sel).forEach(el => el.remove());
  });

  let text = (clone.innerText || clone.textContent || '').trim();
  text = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  if (text.length < 10) {
    return extractGenericContent(lang);
  }

  return {
    success: true,
    content: text,
    url: window.location.href,
    title: document.title,
    length: text.length,
    language: lang,
  };
}

function extractLeetCodeContent() {
  // Detect active programming language from tabs
  const lang = detectProgrammingLanguage();

  // Priority selectors for LeetCode problem description
  const prioritySelectors = [
    '.elfm',
    '.question-content',
    '[data-track-load]',
    '.content__u3I1r',
  ];

  let targetElement = null;
  for (const sel of prioritySelectors) {
    const el = document.querySelector(sel);
    if (el && el.innerText.trim().length > 50) {
      targetElement = el;
      break;
    }
  }

  if (!targetElement) {
    return extractGenericContent(lang);
  }

  const clone = targetElement.cloneNode(true);

  const noiseSelectors = [
    'script', 'style',
    '.comment', '.discussion',
    '.CodeMirror', '.monaco-editor',
    'button', 'a', 'svg', 'img',
    '.progress', '.tabs', '.tab-item',
    '.social-share', '.rating',
  ];
  noiseSelectors.forEach(sel => {
    clone.querySelectorAll(sel).forEach(el => el.remove());
  });

  let text = (clone.innerText || clone.textContent || '').trim();
  text = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  if (text.length < 10) {
    return { success: false, message: '未找到有效题目内容' };
  }

  return {
    success: true,
    content: text,
    url: window.location.href,
    title: document.title,
    length: text.length,
    language: lang,
  };
}

// Detect the active programming language from page tabs
function detectProgrammingLanguage() {
  const langs = ['java', 'python', 'python3', 'c++', 'cpp', 'javascript', 'js', 'typescript', 'ts', 'go', 'rust', 'c', 'c#', 'kotlin', 'swift', 'dart', 'racket', 'ruby', 'php', 'elixir', 'erlang', 'scala', 'cangjie'];

  // === LeetCode CN specific: search ONLY inside the code editor area ===
  // Find the editor container first
  const editorContainers = document.querySelectorAll(
    '[class*="editor"], [class*="Editor"], [class*="monaco"], [class*="codemirror"], [class*="CodeMirror"], [class*="code-editor"]'
  );

  for (const editor of editorContainers) {
    // Skip tiny elements
    if (editor.offsetWidth < 100) continue;

    // Search for language dropdown/triggers inside the editor header/toolbar
    const header = editor.querySelector('[class*="header"], [class*="Header"], [class*="toolbar"], [class*="Toolbar"], [class*="top-bar"]');
    const searchArea = header || editor;

    // Method A: Look for a dropdown trigger button with language text
    const triggers = searchArea.querySelectorAll(
      '[class*="lang"], [class*="Lang"], [class*="language"], [class*="select"], [class*="Select"], [class*="dropdown"], [class*="Dropdown"], [class*="picker"], [class*="Picker"]'
    );

    for (const trigger of triggers) {
      const text = trigger.textContent?.trim().toLowerCase() || '';
      if (text.length === 0 || text.length > 20) continue;
      // Only match exact language names (avoid partial matches like "javascript" in "typescript")
      const found = langs.find(l => text === l || text === `✓ ${l}`);
      if (found) return normalizeLang(found);
    }

    // Method B: Look for any element in editor header that contains just a language name
    const allTexts = searchArea.querySelectorAll('span, div, button');
    for (const el of allTexts) {
      const text = el.textContent?.trim().toLowerCase() || '';
      if (text.length === 0 || text.length > 15) continue;
      const found = langs.find(l => text === l);
      if (found) return normalizeLang(found);
    }
  }

  // === Fallback: search open dropdown menus (only if they're near the editor) ===
  const openDropdowns = document.querySelectorAll('[role="menu"], [class*="menu"][style*="display"]:not([style*="none"])');
  for (const dd of openDropdowns) {
    const checkedItems = dd.querySelectorAll('[class*="check"], [class*="Check"], .checked, [class*="selected"], [aria-checked="true"]');
    for (const item of checkedItems) {
      const text = item.textContent?.trim().toLowerCase() || '';
      const found = langs.find(l => text === l || text === `✓ ${l}` || text.startsWith(l + ' '));
      if (found) return normalizeLang(found);
    }
  }

  // === Last fallback: code block language hint ===
  const codeBlocks = document.querySelectorAll('code[class*="language-"]');
  if (codeBlocks.length > 0) {
    const cls = codeBlocks[0].className || '';
    const match = cls.match(/language-(\w+)/);
    if (match) return match[1];
  }

  return null;
}

function normalizeLang(lang) {
  if (lang === 'python3' || lang === 'python') return 'python';
  if (lang === 'cpp' || lang === 'c++') return 'cpp';
  if (lang === 'javascript' || lang === 'js') return 'javascript';
  return lang;
}

function extractGenericContent(detectedLang) {
  // Elements to exclude
  const excludeSelectors = [
    'script', 'style', 'noscript',
    'nav', 'header', 'footer',
    '.nav', '.header', '.footer', '.sidebar', '.menu',
    '.ad', '.ads', '.advertisement', '.banner',
    '.cookie', '.popup', '.modal', '.overlay',
    'button', 'input', 'select', 'textarea',
    '[role="navigation"]', '[role="banner"]', '[role="complementary"]',
    '.breadcrumb', '.pagination', '.toolbar',
    '.comment', '.discussion', '.comment-list', '.comment-content',
    '.CodeMirror', '.editor', '.monaco-editor', '.ace_editor',
    '.social-share', '.share-buttons',
    '.rating', '.vote', '.like', '.favorite',
    '#nav', '#header', '#footer', '#sidebar',
  ];

  const clone = document.body.cloneNode(true);

  excludeSelectors.forEach(sel => {
    clone.querySelectorAll(sel).forEach(el => el.remove());
  });

  let text = clone.innerText || clone.textContent || '';
  text = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  if (text.length < 10) {
    return { success: false, message: '未找到有效文本内容' };
  }

  const lang = detectedLang || detectProgrammingLanguage();

  return {
    success: true,
    content: text,
    url: window.location.href,
    title: document.title,
    length: text.length,
    language: lang,
  };
}

// Listen for messages from popup/sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extract') {
    const result = extractPageContent();
    sendResponse(result);
  }

  if (message.action === 'removeRestrictions') {
    removeRestrictions();
    sendResponse({ success: true });
  }
});

// Check settings on load and auto-remove restrictions if enabled
(async () => {
  try {
    const settings = await new Promise(resolve => {
      chrome.storage.local.get('settings', result => {
        resolve(result.settings || {});
      });
    });
    if (settings.restrictionsRemoval === true) {
      removeRestrictions();
    }
  } catch {
    // Ignore storage errors
  }
})();
})();
