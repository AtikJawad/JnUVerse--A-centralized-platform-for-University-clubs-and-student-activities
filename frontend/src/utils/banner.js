/**
 * Event banner helpers — Week 7 Stage 2
 *
 * Returns an inline style that paints the event banner over an existing
 * gradient cover, with a tint so the text on top stays readable.
 * Returns undefined when there is no banner, so the gradient placeholder shows.
 *
 * @param {string|null} url - `event.banner` from the backend
 * @param {"dark"|"light"} [tone] - "dark" for covers with white text, "light" for dark text
 */
export function bannerStyle(url, tone = "dark") {
  if (!url) return undefined;
  const tint =
    tone === "light"
      ? "linear-gradient(rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0.8))"
      : "linear-gradient(rgba(15, 23, 42, 0.25), rgba(15, 23, 42, 0.7))";
  return {
    backgroundImage: `${tint}, url("${encodeURI(url)}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}
