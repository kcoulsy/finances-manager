"use client";

import DOMPurify from "dompurify";

/**
 * Sanitize HTML content to prevent XSS attacks
 * Removes dangerous scripts, event handlers, and other unsafe content
 *
 * Note: This function requires a browser environment (window object).
 * It will return an empty string if called server-side, but should only
 * be called from client components.
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering with dangerouslySetInnerHTML
 *
 * @example
 * ```ts
 * const sanitized = sanitizeHtml("<p>Hello <script>alert('XSS')</script></p>");
 * // Returns: "<p>Hello </p>"
 * ```
 */
export function sanitizeHtml(html: string): string {
  // DOMPurify requires a browser environment
  // In Next.js, client components can render on server initially,
  // so we check for window and return empty string if unavailable
  if (typeof window === "undefined") {
    return "";
  }

  return DOMPurify.sanitize(html, {
    // Allow common HTML tags and formatting
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "a",
      "blockquote",
      "code",
      "pre",
      "div",
      "span",
      "img",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "hr",
    ],
    // Allow safe attributes
    ALLOWED_ATTR: [
      "href",
      "title",
      "alt",
      "src",
      "width",
      "height",
      "style",
      "class",
      "target",
      "rel",
      "colspan",
      "rowspan",
      "align",
    ],
    // Allow safe CSS properties in style attributes
    ALLOW_DATA_ATTR: false,
    // Strip event handlers and dangerous attributes
    FORBID_TAGS: [
      "script",
      "iframe",
      "object",
      "embed",
      "form",
      "input",
      "button",
    ],
    // Ensure links are safe
    ADD_ATTR: ["target"],
    // Sanitize URLs in href and src attributes
    SANITIZE_DOM: true,
  });
}
