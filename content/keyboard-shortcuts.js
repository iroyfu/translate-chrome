// *********************************/
// 键盘快捷键处理脚本
// 负责监听用户定义的快捷键并执行相应的翻译操作
// *********************************/

// 默认快捷键配置
const defaultShortcuts = {
  compareTranslate: "Ctrl+Shift+C",
  replaceTranslate: "Ctrl+Shift+R"
};

// 当前快捷键配置
let currentShortcuts = { ...defaultShortcuts };

// 跟踪当前翻译状态
let translationState = {
  isTranslated: false,
  lastTranslateType: null // 'compare' 或 'replace'
};

// 监听翻译状态变化（通过content.js发送的消息）
window.addEventListener('message', (event) => {
  if (event.source === window && event.data) {
    if (event.data.action === 'translationStarted') {
      translationState.isTranslated = false;
      translationState.lastTranslateType = event.data.type;
    } else if (event.data.action === 'translationCompleted') {
      translationState.isTranslated = true;
      translationState.lastTranslateType = event.data.type;
    } else if (event.data.action === 'translationRestored') {
      translationState.isTranslated = false;
      translationState.lastTranslateType = null;
    }
  }
});

// 加载保存的快捷键设置 - 使用函数表达式避免重复声明
window.loadShortcuts = window.loadShortcuts || function() {
  chrome.storage.sync.get({
    shortcuts: defaultShortcuts
  }, (items) => {
    currentShortcuts = { ...defaultShortcuts, ...items.shortcuts };
  });
};


// 初始化时加载快捷键设置
window.loadShortcuts();

// 监听存储变化，更新快捷键配置
chrome.storage.onChanged.addListener((changes) => {
  if (changes.shortcuts) {
    currentShortcuts = { ...defaultShortcuts, ...changes.shortcuts.newValue };
  }
});

// 解析快捷键字符串为键组合
const parseShortcut = (shortcut) => {
  if (!shortcut || typeof shortcut !== 'string') return null;
  
  const parts = shortcut.split('+').map(p => p.trim());
  return {
    ctrl: parts.some(p => p.toLowerCase() === 'ctrl'),
    alt: parts.some(p => p.toLowerCase() === 'alt'),
    shift: parts.some(p => p.toLowerCase() === 'shift'),
    meta: parts.some(p => p.toLowerCase() === 'meta'),
    // 提取非修饰键部分
    key: parts.find(p => !['ctrl', 'alt', 'shift', 'meta'].includes(p.toLowerCase())) || ''
  };
};

// 检查按键事件是否匹配快捷键
const isShortcutMatch = (event, shortcut) => {
  const parsedShortcut = parseShortcut(shortcut);
  if (!parsedShortcut) return false;
  
  console.log('检查快捷键匹配:', shortcut, parsedShortcut, {
    eventKey: event.key,
    eventCtrl: event.ctrlKey,
    eventAlt: event.altKey,
    eventShift: event.shiftKey,
    eventMeta: event.metaKey
  });
  
  // 处理特殊键名转换
  let eventKey = event.key;
  if (eventKey === ' ') eventKey = 'Space';
  
  // 确保所有修饰键都匹配，并且主按键匹配（不区分大小写）
  const modifiersMatch = 
    event.ctrlKey === parsedShortcut.ctrl &&
    event.altKey === parsedShortcut.alt &&
    event.shiftKey === parsedShortcut.shift &&
    event.metaKey === parsedShortcut.meta;
    
  const keyMatch = eventKey.toLowerCase() === parsedShortcut.key.toLowerCase();
  
  const isMatch = modifiersMatch && keyMatch;
  console.log('快捷键匹配结果:', isMatch);
  return isMatch;
};

// 处理快捷键事件
const handleKeyboardShortcut = (event) => {
  // 防止在输入框中触发快捷键
  if (event.target.tagName === 'INPUT' || 
      event.target.tagName === 'TEXTAREA' || 
      event.target.isContentEditable) {
    return;
  }

  // 检查并执行对应的翻译操作
  if (isShortcutMatch(event, currentShortcuts.compareTranslate)) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('检测到对比翻译快捷键，当前翻译状态:', translationState);
    
    // 如果页面已翻译且上次使用的是对比翻译，则恢复原文
    if (translationState.isTranslated && translationState.lastTranslateType === 'compare') {
      console.log('触发恢复原文快捷键');
      window.postMessage({ action: 'restoreOriginal' }, '*');
    } else {
      console.log('触发流式对比翻译快捷键');
      // 发送消息给content.js执行对比翻译
      window.postMessage({
        action: 'streamTranslatePage',
        type: 'compare'
      }, '*');
    }
  } 
  else if (isShortcutMatch(event, currentShortcuts.replaceTranslate)) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('检测到替换翻译快捷键，当前翻译状态:', translationState);
    
    // 如果页面已翻译且上次使用的是替换翻译，则恢复原文
    if (translationState.isTranslated && translationState.lastTranslateType === 'replace') {
      console.log('触发恢复原文快捷键');
      window.postMessage({ action: 'restoreOriginal' }, '*');
    } else {
      console.log('触发流式替换翻译快捷键');
      // 发送消息给content.js执行替换翻译
      window.postMessage({
        action: 'streamTranslatePage',
        type: 'replace'
      }, '*');
    }
  }
};

// 启用键盘事件监听，确保快捷键正常工作
document.addEventListener('keydown', handleKeyboardShortcut);

// 注释：之前禁用了直接监听，现在重新启用以确保快捷键功能正常

// 当页面加载完成后，初始化快捷键状态
window.addEventListener('load', () => {
  console.log('快捷键模块已初始化');
  // 加载保存的快捷键设置
  window.loadShortcuts();
});

// 监听来自content.js的消息，用于接收快捷键更新通知
window.addEventListener('message', (event) => {
  if (event.source === window && event.data && event.data.action === 'updateShortcuts') {
    window.loadShortcuts();
  }
});

// 导出功能（如果需要在其他模块中使用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadShortcuts: window.loadShortcuts,
    isShortcutMatch
  };
}