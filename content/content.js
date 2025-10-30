// *********************************/
// 默认的内容脚本
// 负责处理页面加载、语言检测等功能
// 主体的样式和基础操作也可以在这里加载或处理
// *********************************/

// 存储检测到的语言
let detectedLanguage = null;

// 获取当前标签页ID
const getCurrentTabId = async () => {
  try {
    // 如果是在content script中运行
    if (chrome.runtime?.id) {
      const response = await chrome.runtime.sendMessage({
        action: "getCurrentTabId",
      });
      return response.tabId;
    }
    // 如果是在独立窗口中运行
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0].id;
  } catch (error) {
    console.error("获取标签页ID失败:", error);
    return null;
  }
};

// 检测页面主要语言
const detectPageLanguage = async () => {
  const mainContent = document.body.innerText.slice(0, 1000);
  detectedLanguage = await detectLanguage(mainContent);

  // 发送检测结果
  const tabId = await getCurrentTabId();
  if (tabId) {
    chrome.runtime.sendMessage({
      action: "updateSourceLanguage",
      language: detectedLanguage,
      tabId: tabId,
    });
  }
};

// 监听来自background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('content.js收到来自background的消息:', request);
  
  if (request.action === "panelCreated") {
    // 如果已经检测到语言，立即发送
    if (detectedLanguage) {
      chrome.runtime.sendMessage({
        action: "updateSourceLanguage",
        language: detectedLanguage,
        tabId: request.tabId,
      });
      sendResponse({}); // 立即发送响应
    } else {
      // 如果还没有检测结果，立即进行检测
      detectPageLanguage().then(() => {
        sendResponse({}); // 检测完成后发送响应
      });
      return true; // 表示将异步发送响应
    }
  } else if (request.action === "streamTranslatePage") {
    console.log("开始流式对比翻译============");
    
    // 确保streamTranslatePage函数存在
    if (typeof streamTranslatePage === 'function') {
      // 发送翻译开始的状态消息
      window.postMessage({ action: 'translationStarted', type: 'compare' }, '*');
      streamTranslatePage("compare").then(() => {
        // 发送翻译完成的状态消息
        window.postMessage({ action: 'translationCompleted', type: 'compare' }, '*');
        sendResponse({ success: true });
      }).catch(error => {
        console.error('翻译失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    } else {
      console.error('streamTranslatePage函数未定义');
      sendResponse({ success: false, error: '函数未定义' });
    }
    return true; // 表示将异步发送响应
  } else if (request.action === "streamReplaceTranslate") {
    console.log("开始流式替换翻译============");
    
    // 确保streamTranslatePage函数存在
    if (typeof streamTranslatePage === 'function') {
      // 发送翻译开始的状态消息
      window.postMessage({ action: 'translationStarted', type: 'replace' }, '*');
      streamTranslatePage("replace").then(() => {
        // 发送翻译完成的状态消息
        window.postMessage({ action: 'translationCompleted', type: 'replace' }, '*');
        sendResponse({ success: true });
      }).catch(error => {
        console.error('替换翻译失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    } else {
      console.error('streamTranslatePage函数未定义');
      sendResponse({ success: false, error: '函数未定义' });
    }
    return true; // 表示将异步发送响应
  } else if (request.action === "restoreOriginal") {
    // 确保restoreOriginal函数存在
    if (typeof restoreOriginal === 'function') {
      restoreOriginal();
      sendResponse({ success: true });
    } else {
      console.error('restoreOriginal函数未定义');
      sendResponse({ success: false, error: '函数未定义' });
    }
  } else if (request.action === "detectChineseVariant") {
    const isTraditional = detectChineseVariant(document.body.innerText);
    sendResponse({ isTraditional });
  } else if (request.action === "stopTranslation") {
    // 确保stopTranslation函数存在
    if (typeof stopTranslation === 'function') {
      stopTranslation();
      sendResponse({ success: true });
    } else {
      console.error('stopTranslation函数未定义');
      sendResponse({ success: false, error: '函数未定义' });
    }
  } else if (request.action === "updateTranslationProgress") {
    // 确保updateProgress函数存在
    if (typeof updateProgress === 'function') {
      updateProgress(request.progress);
      sendResponse({ success: true });
    } else {
      console.error('updateProgress函数未定义');
      sendResponse({ success: false, error: '函数未定义' });
    }
  } else if (request.action === "clearCache") {
    // 确保clearCache函数存在
    if (typeof clearCache === 'function') {
      clearCache(request.cacheType).then((result) => {
        sendResponse({ success: true, result });
      }).catch(error => {
        console.error('清除缓存失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    } else {
      console.error('clearCache函数未定义');
      sendResponse({ success: false, error: '函数未定义' });
    }
    return true; // 表示将异步发送响应
  } else if (request.action === "checkCache") {
    // 确保checkCache函数存在
    if (typeof checkCache === 'function') {
      checkCache().then((result) => {
        sendResponse({ success: true, result });
      }).catch(error => {
        console.error('检查缓存失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    } else {
      console.error('checkCache函数未定义');
      sendResponse({ success: false, error: '函数未定义' });
    }
    return true; // 表示将异步发送响应
  }
});


// 在页面加载完成后立即开始检测
document.addEventListener("DOMContentLoaded", () => {
  detectPageLanguage();

  // 有需要可以在这里动态加载CSS文件
});

// 在页面内容变化时重新检测
const observer = new MutationObserver(() => {
  if (document.body) {
    detectPageLanguage();
    observer.disconnect();
  }
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

// 监听来自keyboard-shortcuts.js和background的消息
window.addEventListener('message', async (event) => {
  // 验证消息来源
  if (event.source === window && event.data) {
    const { action, type, source } = event.data;
    
    console.log('content.js收到window消息:', event.data);
    
    // 处理来自background-command的消息（作为chrome.tabs.sendMessage的备选方案）
    if (source === 'background-command') {
      console.log('收到来自background的备选命令:', action);
      
      if (action === 'streamTranslatePage') {
        console.log('通过background备选通道触发对比翻译');
        // 确保streamTranslatePage函数存在
        if (typeof streamTranslatePage === 'function') {
          // 发送翻译开始的状态消息
          window.postMessage({ action: 'translationStarted', type: 'compare' }, '*');
          await streamTranslatePage('compare');
          // 发送翻译完成的状态消息
          window.postMessage({ action: 'translationCompleted', type: 'compare' }, '*');
        } else {
          console.error('streamTranslatePage函数未定义');
        }
      } else if (action === 'streamReplaceTranslate') {
        console.log('通过background备选通道触发替换翻译');
        // 确保streamTranslatePage函数存在
        if (typeof streamTranslatePage === 'function') {
          // 发送翻译开始的状态消息
          window.postMessage({ action: 'translationStarted', type: 'replace' }, '*');
          await streamTranslatePage('replace');
          // 发送翻译完成的状态消息
          window.postMessage({ action: 'translationCompleted', type: 'replace' }, '*');
        } else {
          console.error('streamTranslatePage函数未定义');
        }
      }
      return;
    }
    
    switch (action) {
      case 'streamTranslatePage':
        console.log('通过快捷键触发翻译:', type);
        if (type === 'compare' || type === 'replace') {
          // 确保streamTranslatePage函数存在
          if (typeof streamTranslatePage === 'function') {
            // 发送翻译开始的状态消息
            window.postMessage({ action: 'translationStarted', type: type }, '*');
            await streamTranslatePage(type);
            // 发送翻译完成的状态消息
            window.postMessage({ action: 'translationCompleted', type: type }, '*');
          } else {
            console.error('streamTranslatePage函数未定义');
          }
        }
        break;
      case 'restoreOriginal':
        console.log('通过快捷键触发恢复原文');
        // 确保restoreOriginal函数存在
        if (typeof restoreOriginal === 'function') {
          restoreOriginal();
          // 发送恢复原文的状态消息
          window.postMessage({ action: 'translationRestored' }, '*');
        } else {
          console.error('restoreOriginal函数未定义');
        }
        break;
      case 'updateShortcuts':
        // 当快捷键更新时，通知keyboard-shortcuts.js重新加载
        notifyShortcutsUpdate();
        break;
    }
  }
});

// 通知keyboard-shortcuts.js重新加载快捷键设置的函数
const notifyShortcutsUpdate = async () => {
  // 通知keyboard-shortcuts.js重新加载快捷键设置
  window.postMessage({ action: 'updateShortcuts' }, '*');
};

// 检测中文简繁体
const detectChineseVariant = (text) => {
  // 简单判断：如果含有繁体特有字符，则可能是繁体中文
  const traditionalChars = "魚機車個島後會長東買來紙風無紅電開關時實關";
  const simplifiedChars = "鱼机车个岛后会长东买来纸风无红电开关时实关";

  // 统计繁体和简体字符出现次数
  let traditionalCount = 0;
  let simplifiedCount = 0;

  for (let i = 0; i < Math.min(text.length, 1000); i++) {
    const char = text[i];
    if (traditionalChars.includes(char)) traditionalCount++;
    if (simplifiedChars.includes(char)) simplifiedCount++;
  }

  return traditionalCount > simplifiedCount;
};
