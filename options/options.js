// *********************************/
// 设置页面
// 设置页面中包含API密钥、模型选择、提示词配置等功能
// *********************************/

document.addEventListener("DOMContentLoaded", () => {
  const apiEndpoint = document.getElementById("apiEndpoint");
  const apiKey = document.getElementById("apiKey");
  const model = document.getElementById("model");
  const promptType = document.getElementById("promptType");
  const promptContent = document.getElementById("promptContent");
  const saveButton = document.getElementById("save");
  const status = document.getElementById("status");
  const toggleApiKey = document.getElementById("toggleApiKey");
  
  // 快捷键设置元素
  const shortcutCompareTranslate = document.getElementById("shortcutCompareTranslate");
  const shortcutReplaceTranslate = document.getElementById("shortcutReplaceTranslate");
  const recordButtons = document.querySelectorAll('.record-button');
  let isRecording = false;
  let currentTargetInput = null;

  // 默认提示词
  const defaultPrompts = {
    selection:
      "你是一个翻译助手。请将用户输入的文本翻译成{LANG}，只返回翻译结果，不需要解释。",
    advancedSelection: `你是一个高级翻译助手。请将用户输入的文本翻译成{LANG}，并提供更多信息。
    返回JSON格式，包含以下字段:
    - text: 原文
    - translation: 翻译结果
    - complex_words: 复杂单词列表，每个单词包含word(单词)、phonetic(音标)、part_of_speech(词性)、definition(定义)字段
    不要返回多余内容，确保返回的是有效的JSON格式。`,
    window:
      "你是一个翻译助手。请将用户输入的文本翻译成{LANG}，保持原文的格式和风格。只返回翻译结果，不需要解释。",
    page: "你是一个翻译助手。请将用户输入的文本翻译成{LANG}，保持原文的格式和风格。翻译时要考虑上下文的连贯性。只返回翻译结果，不需要解释。",
  };
  
  // 默认快捷键
  const defaultShortcuts = {
    compareTranslate: "Ctrl+Shift+C",
    replaceTranslate: "Ctrl+Shift+R"
  };

  // 当前提示词配置
  let prompts = { ...defaultPrompts };

  // 加载保存的设置
  chrome.storage.sync.get(
    {
      apiEndpoint: "",
      apiKey: "",
      model: "",
      prompts: defaultPrompts,
      shortcuts: defaultShortcuts
    },
    (items) => {
      apiEndpoint.value = items.apiEndpoint;
      apiKey.value = items.apiKey;
      model.value = items.model;
      prompts = { ...defaultPrompts, ...items.prompts };
      promptContent.value = prompts[promptType.value];
      
      // 加载快捷键设置
      const shortcuts = { ...defaultShortcuts, ...items.shortcuts };
      shortcutCompareTranslate.value = shortcuts.compareTranslate;
      shortcutReplaceTranslate.value = shortcuts.replaceTranslate;
    }
  );
  
  // 格式化快捷键（仅做标准化处理，不限制格式）
  const formatShortcut = (shortcut) => {
    if (!shortcut) return '';
    return shortcut;
  };
  
  // 添加键盘录制功能
  recordButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (isRecording) {
        stopRecording();
      }
      
      const targetId = button.getAttribute('data-target');
      currentTargetInput = document.getElementById(targetId);
      isRecording = true;
      
      button.textContent = '正在录制...';
      button.style.backgroundColor = '#ff4444';
      
      // 设置自动超时
      setTimeout(() => {
        if (isRecording) {
          stopRecording();
          status.textContent = '录制已超时';
          setTimeout(() => status.textContent = '', 2000);
        }
      }, 5000);
    });
  });
  
  // 停止录制
  function stopRecording() {
    isRecording = false;
    recordButtons.forEach(button => {
      button.textContent = '录制快捷键';
      button.style.backgroundColor = '';
    });
    currentTargetInput = null;
  }
  
  // 监听键盘事件进行录制
  document.addEventListener('keydown', (e) => {
    if (isRecording && currentTargetInput) {
      e.preventDefault();
      
      // 构建快捷键字符串
      const parts = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (e.metaKey) parts.push('Meta');
      
      // 只有当按下非修饰键时才完成录制
      if (e.key.length === 1 || ['Escape', 'Enter', 'Space', 'Tab', 'Backspace', 'Delete', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        parts.push(e.key === ' ' ? 'Space' : e.key);
        
        if (parts.length > 0) {
          const shortcut = parts.join('+');
          currentTargetInput.value = shortcut;
          status.textContent = '快捷键已设置';
          setTimeout(() => status.textContent = '', 2000);
          stopRecording();
        }
      }
      // 修饰键单独按下时不结束录制，继续等待组合键
    }
  });
  
  // 添加keyup事件监听，用于处理修饰键释放的情况
  document.addEventListener('keyup', (e) => {
    // 修饰键单独释放时不做任何操作
  });

  // 切换提示词类型
  promptType.addEventListener("change", () => {
    promptContent.value =
      prompts[promptType.value] || defaultPrompts[promptType.value];
  });

  // 保存设置
  saveButton.addEventListener("click", () => {
    // 更新当前类型的提示词
    prompts[promptType.value] = promptContent.value;
    
    // 验证并格式化快捷键
    const compareShortcut = shortcutCompareTranslate.value ? formatShortcut(shortcutCompareTranslate.value) : defaultShortcuts.compareTranslate;
    const replaceShortcut = shortcutReplaceTranslate.value ? formatShortcut(shortcutReplaceTranslate.value) : defaultShortcuts.replaceTranslate;
    
    // 移除快捷键格式验证，允许任意格式

    chrome.storage.sync.set(
      {
        apiEndpoint: apiEndpoint.value,
        apiKey: apiKey.value,
        model: model.value,
        prompts: prompts,
        shortcuts: {
          compareTranslate: compareShortcut,
          replaceTranslate: replaceShortcut
        }
      },
      () => {
        status.textContent = "设置已保存。";
        setTimeout(() => {
          status.textContent = "";
        }, 2000);
      }
    );
  });

  // 切换API密钥可见性
  toggleApiKey.addEventListener("click", () => {
    const type = apiKey.type;
    apiKey.type = type === "password" ? "text" : "password";
    toggleApiKey.querySelector(".eye-icon").textContent =
      type === "password" ? "🔒" : "👁️";
  });
});
