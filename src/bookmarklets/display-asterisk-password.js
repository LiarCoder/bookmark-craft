// @name: 显示星号密码

for (let input = document.getElementsByTagName("input"), i = 0; i < input.length; i++) {
  const inputType = input[i].getAttribute("type");
  if (inputType === "password") {
    input[i].setAttribute("type", "text");
    input[i].setAttribute("data-origin-type", inputType);
  }
  if (inputType === "text" && input[i].dataset.originType === "password") {
    input[i].setAttribute("type", "password");
  }
}