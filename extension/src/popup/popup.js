function openOptions() {
  console.log("hi there");
  browser.runtime.openOptionsPage();
  window.close();
}

document.getElementById("options").addEventListener("click", openOptions);
