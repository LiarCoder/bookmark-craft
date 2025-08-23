// 高亮页面中的所有链接
function highlightAllLinks() {
  const links = document.querySelectorAll("a");
  console.log(`Found ${links.length} links to highlight`);

  links.forEach((link, index) => {
    link.style.backgroundColor = "yellow";
    link.style.border = "2px solid red";
    link.title = `Link ${index + 1}: ${link.href}`;
    console.log(`Highlighted link ${index + 1}: ${link.href}`);
  });

  alert(`Highlighted ${links.length} links on this page!`);
}

highlightAllLinks();
