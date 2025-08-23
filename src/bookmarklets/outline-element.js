if (typeof hasOutline == "undefined") hasOutline = false;
document.querySelectorAll("*").forEach((item) => {
  item.style.outline = hasOutline
    ? "none"
    : "1px solid #" + (~~(Math.random() * (1 << 24))).toString(16);
});
hasOutline = !hasOutline;
