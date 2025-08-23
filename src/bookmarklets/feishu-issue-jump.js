(function () {
  // 配置映射：任务类型前缀 -> URL路径
  const TASK_CONFIG = {
    f: "issue/detail",
    g: "assignment/detail",
    m: "story/detail",
    s: "s/detail",
  };

  // 项目基础URL（可根据需要修改）
  const PROJECT_BASE_URL = "https://project.feishu.cn/b2rl2h";

  // 验证任务号格式
  function validateTaskNumber(input) {
    if (!input) return null;

    // 清理输入：去除空格，转为小写
    const cleanInput = input.trim().toLowerCase();

    // 统一的正则匹配：字母-数字
    const match = cleanInput.match(/^([fgms])-(\d+)$/);

    if (match) {
      const [, prefix, number] = match;
      return { prefix, number };
    }

    return null;
  }

  // 跳转到指定任务
  function jumpToTask(prefix, number) {
    const urlPath = TASK_CONFIG[prefix];
    const targetUrl = `${PROJECT_BASE_URL}/${urlPath}/${number}`;
    window.open(targetUrl, "_blank");
  }

  // 主要处理函数，支持重试
  function processInput() {
    // 获取用户输入并标准化
    const promptText = "请输入飞书任务号\n支持格式：f-123, g-456, m-789, s-012";

    const rawInput = window.prompt(promptText);
    if (!rawInput) return; // 用户取消输入

    const taskInfo = validateTaskNumber(rawInput);

    if (!taskInfo) {
      window.alert(
        "❌ 任务号格式错误！\n\n正确格式示例：\n• f-123\n• g-456\n• m-789\n• s-012"
      );
      // 错误提示后重新尝试
      return processInput();
    }

    // 跳转到任务页面
    jumpToTask(taskInfo.prefix, taskInfo.number);
  }

  // 尝试读取剪贴板并检查是否为合法任务号
  async function tryClipboardFirst() {
    try {
      // 检查是否支持剪贴板API
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        // 不支持剪贴板API，直接显示prompt
        return processInput();
      }

      // 读取剪贴板内容
      const clipboardText = await navigator.clipboard.readText();
      const taskInfo = validateTaskNumber(clipboardText);

      if (taskInfo) {
        // 剪贴板中有合法任务号，直接跳转
        jumpToTask(taskInfo.prefix, taskInfo.number);
      } else {
        // 剪贴板中没有合法任务号，显示prompt
        processInput();
      }
    } catch (error) {
      // 剪贴板读取失败（可能是权限问题），直接显示prompt
      processInput();
    }
  }

  // 开始处理
  tryClipboardFirst();
})();
