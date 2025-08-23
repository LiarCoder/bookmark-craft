// @name: 测试小书签示例

// 测试小书签示例 - 包含 console.log 和复杂逻辑
function testBookmarklet() {
  console.log("This console.log should be removed by Terser");

  const message = "Hello from test bookmarklet!";
  const currentUrl = window.location.href;

  // 一些复杂的逻辑用于测试压缩效果
  if (currentUrl.includes("github.com")) {
    alert(message + " - You are on GitHub!");
    console.log("GitHub detected");
  } else if (currentUrl.includes("stackoverflow.com")) {
    alert(message + " - You are on Stack Overflow!");
    console.log("Stack Overflow detected");
  } else {
    alert(message);
    console.log("Unknown site");
  }

  debugger; // This should also be removed
}

testBookmarklet();
