export const APP_VIEW = {
  SEARCH: "search",
  ABOUT: "about",
};

export function viewFromHash() {
  return window.location.hash === "#about" ? APP_VIEW.ABOUT : APP_VIEW.SEARCH;
}

export function navigateToView(view) {
  window.location.hash = view === APP_VIEW.ABOUT ? "#about" : "";
}
