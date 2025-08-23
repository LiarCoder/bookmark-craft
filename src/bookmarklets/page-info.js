// 显示页面基本信息
function showPageInfo() {
  const info = {
    title: document.title,
    url: window.location.href,
    domain: window.location.hostname,
    images: document.images.length,
    links: document.links.length,
    scripts: document.scripts.length,
  };

  console.log("Page information:", info);

  const message = `页面信息:
标题: ${info.title}
URL: ${info.url}
域名: ${info.domain}
图片数量: ${info.images}
链接数量: ${info.links}
脚本数量: ${info.scripts}`;

  alert(message);
}

showPageInfo();
