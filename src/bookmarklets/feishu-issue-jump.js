(function() {
  const issue = window.prompt('请输入飞书任务号');
  if (issue) {
    let issueInfo = issue.match(/f-(\d+)/);
    if (issueInfo) {
      const issueNumber = issueInfo[1];
      return window.open(`https://project.feishu.cn/b2rl2h/issue/detail/${issueNumber}`);
    }
    issueInfo = issue.match(/g-(\d+)/);
    if (issueInfo) {
      const issueNumber = issueInfo[1];
      return window.open(`https://project.feishu.cn/b2rl2h/assignment/detail/${issueNumber}`);
    }
    issueInfo = issue.match(/m-(\d+)/);
    if (issueInfo) {
      const issueNumber = issueInfo[1];
      return window.open(`https://project.feishu.cn/b2rl2h/story/detail/${issueNumber}`);
    }
    issueInfo = issue.match(/s-(\d+)/);
    if (issueInfo) {
      const issueNumber = issueInfo[1];
      return window.open(`https://project.feishu.cn/b2rl2h/s/detail/${issueNumber}`);
    }
    window.alert('请输入符合格式的飞书任务号，比如：f-xxx，g-xxx，m-xxx，s-xxx');
  }
})();