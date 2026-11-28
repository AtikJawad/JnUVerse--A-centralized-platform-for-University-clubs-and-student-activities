import { useState } from "react";

/**
 * ClubLogo — Week 7 Stage 2
 *
 * Renders a club's uploaded logo inside the caller's container, or the caller's
 * fallback (icon / initials) when `src` is null or the image fails to load.
 * The container keeps the caller's size, radius and background classes, so
 * existing layouts are unchanged for clubs without a logo.
 *
 * @param {string|null} src - Full logo URL from the backend (`club.logo`), or null
 * @param {string} name - Club name, used for the alt text
 * @param {string} className - Container classes (size, radius, background, flex centering)
 * @param {React.ReactNode} children - Fallback content shown when there is no usable image
 */
export default function ClubLogo({ src, name, className = "", children }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <div className={`${className} overflow-hidden`}>
      {showImage ? (
        <img
          src={src}
          alt={`${name || "Club"} logo`}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        children
      )}
    </div>
  );
}
