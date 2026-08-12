// @name: 显示元素边框
// @bookmark-name: 元素描边

if (typeof hasOutline === "undefined") hasOutline = false;
document.querySelectorAll("*").forEach((item) => {
  item.style.outline = hasOutline
    ? "none"
    : "1px solid #" +
      (~~(Math.random() * (1 << 24))).toString(16).padStart(6, "0");
});
hasOutline = !hasOutline;
