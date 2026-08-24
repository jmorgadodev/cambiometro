"use client";

import React, { useState, useId, useRef, useEffect } from "react";

interface AccessibleTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  ariaLabel?: string;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export default function AccessibleTooltip({
  content,
  children,
  ariaLabel = "Información metodológica adicional",
  position = "top",
  className = "",
}: AccessibleTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isVisible) {
        setIsVisible(false);
      }
    }
    if (isVisible) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVisible]);

  return (
    <div
      ref={containerRef}
      className={`accessible-tooltip-wrapper ${className}`}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
      }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <button
        type="button"
        aria-describedby={isVisible ? tooltipId : undefined}
        aria-label={ariaLabel}
        aria-expanded={isVisible}
        onClick={(e) => {
          e.stopPropagation();
          setIsVisible((prev) => !prev);
        }}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          color: "inherit",
          font: "inherit",
          textAlign: "inherit",
          outline: "none",
        }}
        className="tooltip-trigger"
      >
        {children}
      </button>

      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          style={{
            position: "absolute",
            zIndex: 1000,
            width: "max-content",
            maxWidth: "320px",
            background: "var(--surface)",
            color: "var(--text-1)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "0.6rem 0.8rem",
            fontSize: "0.75rem",
            lineHeight: 1.45,
            boxShadow: "0 8px 24px var(--overlay-shadow, var(--border))",
            pointerEvents: "auto",
            transition: "opacity 0.15s ease, transform 0.15s ease",
            ...(position === "top"
              ? {
                  bottom: "calc(100% + 8px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                }
              : position === "bottom"
              ? {
                  top: "calc(100% + 8px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                }
              : position === "left"
              ? {
                  right: "calc(100% + 8px)",
                  top: "50%",
                  transform: "translateY(-50%)",
                }
              : {
                  left: "calc(100% + 8px)",
                  top: "50%",
                  transform: "translateY(-50%)",
                }),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {content}
        </div>
      )}
    </div>
  );
}
