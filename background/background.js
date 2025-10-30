// 监听来自content script的消息
// 获取当前标签页ID (整页翻译会缓存网页编号等内容作为键)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getCurrentTabId") {
    sendResponse({ tabId: sender.tab?.id });
    return false;
  }
});

// 监听Chrome commands事件
chrome.commands.onCommand.addListener((command, tab) => {
  console.log('=====收到Chrome命令=====', command, '标签页:', tab);
  
  // 验证标签页信息
  if (!tab || !tab.id || !tab.url) {
    console.error('无效的标签页信息:', tab);
    return;
  }
  
  // 检查标签页URL是否可执行脚本
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
    console.warn(`无法在不支持的URL上执行命令: ${tab.url}`);
    // 避免使用notifications API以防止额外错误
    console.log('提示: 无法在此页面上使用快捷键翻译功能，不支持的页面类型。');
    return;
  }
  
  // 简化处理，直接发送消息
  if (command === 'compareTranslate' || command === 'replaceTranslate') {
    // 再次检查URL，确保在不支持的页面上不会尝试发送消息
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
      console.warn(`命令执行被阻止: 不支持在${tab.url}上执行操作`);
      return;
    }
    
    const action = command === 'compareTranslate' ? 'streamTranslatePage' : 'streamReplaceTranslate';
    console.log(`发送${action}消息到标签页:`, tab.id);
    
    // 异步发送消息，使用Promise处理并捕获所有可能的错误
    try {
      chrome.tabs.sendMessage(tab.id, { action }).catch(error => {
        console.warn('发送消息失败:', error.message || '未知错误');
      });
    } catch (err) {
      console.warn('消息发送过程中出现异常:', err.message || '未知错误');
    }
  }
});

// 存储面板状态（使用对象而不是 Map）
let panelStates = {};

// 面板切换事件
chrome.action.onClicked.addListener((tab) => {
  const tabId = tab?.id;

  // 验证标签页信息和URL
  if (!tab || !tabId || !tab.url) {
    console.error('无效的标签页信息:', tab);
    return;
  }

  // 检查标签页URL是否可执行脚本
  const isUnsupportedUrl = tab.url.startsWith('chrome://') || 
                          tab.url.startsWith('edge://') || 
                          tab.url.startsWith('about:') ||
                          tab.url.startsWith('file://');
                           
  if (isUnsupportedUrl) {
    console.warn(`无法在不支持的URL上执行脚本: ${tab.url}`);
    // 避免使用notifications API，使用简单的日志提示
    console.log('提示: 无法在此页面上使用翻译功能，不支持的页面类型。');
    return;
  }

  // 执行脚本，使用完整的错误处理
  try {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: togglePanel,
      args: [tabId, !!panelStates[tabId]], // 转换为布尔值
    }).then((result) => {
      // 更新面板状态
      if (result && result[0] && result[0].result !== undefined) {
        panelStates[tabId] = result[0].result;
      }
    }).catch(error => {
      console.error("面板切换失败:", error.message || error);
      // 避免使用notifications API
    });
  } catch (err) {
    console.error("执行脚本时出现异常:", err.message || err);
  }
});

// 监听标签页关闭事件
chrome.tabs.onRemoved.addListener((tabId) => {
  delete panelStates[tabId];
});

// 面板切换函数
function togglePanel(tabId, isVisible) {
  let panel = document.querySelector(
    `.translator-panel[data-tab-id="${tabId}"]`
  );

  if (panel) {
    panel.style.display = panel.style.display === "none" ? "block" : "none";
    return panel.style.display === "block";
  } else {
    const iframe = document.createElement("iframe");
    iframe.className = "translator-panel";
    iframe.setAttribute("data-tab-id", tabId);
    iframe.src = chrome.runtime.getURL("panel/panel.html");
    iframe.style.display = "block";
    document.body.appendChild(iframe);
    return true;
  }
}
