import { useState, useId } from "react";
import PropTypes from "prop-types";

/**
 * Standard Stitch Star Path:
 * d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
 */
const STAR_PATH =
  "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";

export const RATING_LABELS = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

/**
 * Reusable StarRating component supporting both interactive student rating
 * and read-only aggregate rating presentation, styled strictly with Google Stitch tokens.
 */
export default function StarRating({
  value = 0,
  onChange,
  onHover,
  disabled = false,
  readOnly = false,
  size = "lg", // "sm" | "md" | "lg"
  ariaLabel = "Event rating from 1 to 5 stars",
}) {
  const [hoverRating, setHoverRating] = useState(0);
  const groupId = useId();

  // Active score to display on the stars (hover preview takes precedence during interaction)
  const displayScore = !readOnly && !disabled && hoverRating > 0 ? hoverRating : value || 0;

  // Size mapping
  const sizeClasses = {
    sm: {
      btn: "w-6 h-6 p-0.5",
      svg: "w-4 h-4",
      gap: "gap-1",
    },
    md: {
      btn: "w-9 h-9 rounded-lg",
      svg: "w-6 h-6",
      gap: "gap-1.5",
    },
    lg: {
      btn: "w-11 h-11 sm:w-12 sm:h-12 rounded-xl",
      svg: "w-8 h-8 sm:w-9 sm:h-9",
      gap: "gap-2 sm:gap-3",
    },
  }[size] || {
    btn: "w-11 h-11 sm:w-12 sm:h-12 rounded-xl",
    svg: "w-8 h-8 sm:w-9 sm:h-9",
    gap: "gap-2 sm:gap-3",
  };

  const handleMouseEnter = (star) => {
    if (readOnly || disabled) return;
    setHoverRating(star);
    if (onHover) onHover(star);
  };

  const handleMouseLeave = () => {
    if (readOnly || disabled) return;
    setHoverRating(0);
    if (onHover) onHover(0);
  };

  const handleClick = (star) => {
    if (readOnly || disabled || !onChange) return;
    onChange(star);
  };

  const handleKeyDown = (e, star) => {
    if (readOnly || disabled || !onChange) return;

    let targetStar = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      targetStar = star === 5 ? 1 : star + 1;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      targetStar = star === 1 ? 5 : star - 1;
    } else if (e.key === "Home") {
      e.preventDefault();
      targetStar = 1;
    } else if (e.key === "End") {
      e.preventDefault();
      targetStar = 5;
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      targetStar = star;
    }

    if (targetStar !== null) {
      onChange(targetStar);
      requestAnimationFrame(() => {
        const nextBtn = document.getElementById(`${groupId}-star-${targetStar}`);
        if (nextBtn) {
          nextBtn.focus();
        }
      });
    }
  };

  // -------------------------------------------------------------
  // Read-Only Presentation Mode
  // -------------------------------------------------------------
  if (readOnly) {
    const formattedScore =
      typeof value === "number" && Number.isFinite(value)
        ? Number(value).toFixed(1)
        : "0.0";

    return (
      <div
        className={`inline-flex items-center ${sizeClasses.gap}`}
        role="img"
        aria-label={`${formattedScore} out of 5 stars`}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          // Fraction handling for aggregate scores
          const isFull = displayScore >= star;
          const isPartial = displayScore > star - 1 && displayScore < star;

          return (
            <span
              key={star}
              className={`inline-flex items-center justify-center ${sizeClasses.btn}`}
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className={`${sizeClasses.svg} transition-colors duration-150 ${
                  isFull || isPartial
                    ? "fill-primary-container text-primary-container opacity-100"
                    : "fill-outline-variant/30 text-outline-variant/30 opacity-30"
                }`}
              >
                <path d={STAR_PATH} />
              </svg>
            </span>
          );
        })}
      </div>
    );
  }

  // -------------------------------------------------------------
  // Interactive Selection Mode (Student Rating)
  // -------------------------------------------------------------
  return (
    <div
      className={`inline-flex items-center justify-center ${sizeClasses.gap}`}
      role="radiogroup"
      aria-label={ariaLabel}
      onMouseLeave={handleMouseLeave}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = displayScore >= star;
        const isSelected = value === star;
        const starLabel = `${star} ${star === 1 ? "star" : "stars"} - ${RATING_LABELS[star]}`;
        const isFocusable = !disabled && ((value > 0 && isSelected) || ((!value || value === 0) && star === 1));

        return (
          <button
            key={star}
            id={`${groupId}-star-${star}`}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={starLabel}
            disabled={disabled}
            tabIndex={isFocusable ? 0 : -1}
            onMouseEnter={() => handleMouseEnter(star)}
            onClick={() => handleClick(star)}
            onKeyDown={(e) => handleKeyDown(e, star)}
            className={`star-btn ${sizeClasses.btn} flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-container focus:ring-offset-2 focus:ring-offset-canvas-base group ${
              disabled
                ? "opacity-50 cursor-not-allowed"
                : "hover:scale-110 active:scale-95 cursor-pointer"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className={`star-icon ${sizeClasses.svg} transition-all duration-200 filter drop-shadow-sm ${
                isFilled
                  ? "fill-primary-container text-primary-container opacity-100 scale-100"
                  : "fill-[#c6c5d6] text-[#c6c5d6] opacity-35 group-hover:opacity-60"
              }`}
            >
              <path d={STAR_PATH} />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

StarRating.propTypes = {
  value: PropTypes.number,
  onChange: PropTypes.func,
  onHover: PropTypes.func,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  ariaLabel: PropTypes.string,
};

