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

  // 主要处理函数，支持重试
  function processInput() {
    // 获取用户输入并标准化
    const rawInput = window.prompt(
      "请输入飞书任务号\n支持格式：f-123, g-456, m-789, s-012"
    );
    if (!rawInput) return; // 用户取消输入

    // 清理输入：去除空格，转为小写
    const cleanInput = rawInput.trim().toLowerCase();

    // 统一的正则匹配：字母-数字
    const match = cleanInput.match(/^([fgms])-(\d+)$/);

    if (!match) {
      window.alert(
        "❌ 任务号格式错误！\n\n正确格式示例：\n• f-123\n• g-456\n• m-789\n• s-012"
      );
      // 错误提示后重新尝试
      return processInput();
    }

    const [, prefix, number] = match;
    const urlPath = TASK_CONFIG[prefix];

    // 构建URL并打开（正则已确保prefix有效，无需再次检查）
    const targetUrl = `${PROJECT_BASE_URL}/${urlPath}/${number}`;
    window.open(targetUrl, "_blank");
  }

  // 开始处理
  processInput();
})();
