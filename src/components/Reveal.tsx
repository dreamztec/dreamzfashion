import { useEffect, useRef, type ReactNode, type ElementType } from "react";

/**
 * Cinematic section reveal: adds .is-visible once the element scrolls into
 * view. A single observer per page; transform/opacity-only animation. The
 * CSS layer fully disables itself under prefers-reduced-motion.
 */
export function Reveal({
  as,
  className = "",
  delay,
  children,
}: {
  as?: ElementType;
  className?: `reveal${string}` | (string & {});
  delay?: 1 | 2 | 3;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const Tag = (as ?? "div") as ElementType;
  const delayClass = delay ? ` reveal-delay-${delay}` : "";
  return (
    <Tag ref={ref} className={`reveal${delayClass} ${className}`}>
      {children}
    </Tag>
  );
}
