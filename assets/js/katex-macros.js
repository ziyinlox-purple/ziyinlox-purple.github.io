// 常用 LaTeX 宏定义
window.katexMacros = {
  "\\RR": "\\mathbb{R}",
  "\\CC": "\\mathbb{C}",
  "\\ZZ": "\\mathbb{Z}",
  "\\NN": "\\mathbb{N}",
  "\\QQ": "\\mathbb{Q}",
  "\\e": "\\mathrm{e}",
  "\\i": "\\mathrm{i}",
  "\\d": "\\mathrm{d}"
};

// 更新渲染配置
document.addEventListener("DOMContentLoaded", function() {
  renderMathInElement(document.body, {
    delimiters: [
      {left: "$$", right: "$$", display: true},
      {left: "$", right: "$", display: false}
    ],
    macros: window.katexMacros,
    throwOnError: false
  });
});