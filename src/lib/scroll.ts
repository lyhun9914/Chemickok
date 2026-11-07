/**
 * The element the page scrolls in: #app-scroll inside in-app browsers (see globals.css, html.inapp-scroll), the
 * document everywhere else.
 */
export function scroller(): HTMLElement {
  const box = document.documentElement.classList.contains("inapp-scroll") ? document.getElementById("app-scroll") : null;
  return box ?? (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}
