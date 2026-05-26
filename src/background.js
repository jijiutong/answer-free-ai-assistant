// Background service worker

// Register side panel and set behavior
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  }
});

// Open side panel when action icon clicked
chrome.action.onClicked.addListener(async (tab) => {
  if (chrome.sidePanel) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Open side panel from popup
  if (message.action === 'openSidePanel') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]?.id && chrome.sidePanel) {
        await chrome.sidePanel.open({ tabId: tabs[0].id });
        // Notify side panel to switch tab (may fail if panel not yet ready)
        chrome.runtime.sendMessage({
          action: 'switchTab',
          tab: message.tab || null,
        }, () => {
          // Suppress "Could not establish connection" when panel is not open yet
          chrome.runtime.lastError;
        });
      }
    });
    return false;
  }

  // Forward extraction results to side panel if needed
  if (message.action === 'extract') {
    return false;
  }

  // Trigger content script extraction from sidepanel/popup
  if (message.action === 'triggerExtract') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) {
        sendResponse({ success: false, message: '无活动标签页' });
        return;
      }
      const url = tabs[0].url || '';
      if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://')) {
        sendResponse({ success: false, message: '当前页面不支持抓题，请在普通网页中使用' });
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { action: 'extract' }, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, message: '无法连接当前页面，请刷新页面后重试' });
          return;
        }
        sendResponse(response || { success: false, message: '抓取失败' });
      });
    });
    return true;
  }

  // Trigger restriction removal
  if (message.action === 'triggerRemoveRestrictions') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) {
        sendResponse({ success: false });
        return;
      }
      const url = tabs[0].url || '';
      if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://')) {
        sendResponse({ success: false });
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { action: 'removeRestrictions' }, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false });
          return;
        }
        sendResponse(response || { success: false });
      });
    });
    return true;
  }
});
