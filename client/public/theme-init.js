// Applies the saved or system theme before the app renders, so dark mode doesn't flash light.
(function () {
  try {
    var stored = window.localStorage.getItem("decodoc:theme");
    var theme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (e) {
    document.documentElement.dataset.theme = "light";
  }
})();
