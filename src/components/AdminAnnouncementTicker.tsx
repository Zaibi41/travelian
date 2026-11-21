import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Megaphone } from "lucide-react";
import type { LiveAnnouncement } from "@/lib/admin-announcements";

/** Scroll speed of the ticker, in pixels per second. */
const SPEED = 40;
const MIN_SECONDS = 18;

function prefersReducedMotion() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

function Messages({ items, hidden }: { items: LiveAnnouncement[]; hidden?: boolean }) {
  return (
    <div aria-hidden={hidden || undefined} className="flex w-max shrink-0 items-center gap-5 pr-5">
      {items.map((item, index) => (
        <span key={item.id} className="flex items-center gap-5">
          {index > 0 && <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-primary/50" />}
          <span>{item.message}</span>
        </span>
      ))}
    </div>
  );
}

/**
 * Admin top bar announcements (#92). Nothing is rendered when there are none. Messages that fit stay still; longer ones
 * scroll, pausing while hovered or focused. With reduced motion they never move: the strip scrolls by hand instead.
 */
export function AdminAnnouncementTicker({ items }: { items: LiveAnnouncement[] }) {
  const reduced = useReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [copyWidth, setCopyWidth] = useState(0);
  const signature = items.map(item => `${item.id}:${item.message}`).join("|");

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const copy = copyRef.current;
    if (!viewport || !copy) return;
    const measure = () => {
      const width = copy.scrollWidth;
      setCopyWidth(width);
      setOverflowing(width > viewport.clientWidth + 1);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(copy);
    return () => observer.disconnect();
  }, [signature]);

  const animate = overflowing && !reduced;
  useEffect(() => {
    const track = trackRef.current;
    if (!animate || !track || typeof track.animate !== "function") return;
    const animation = track.animate([{ transform: "translateX(0)" }, { transform: "translateX(-50%)" }], {
      duration: Math.max(MIN_SECONDS, copyWidth / SPEED) * 1000, iterations: Infinity, easing: "linear",
    });
    animationRef.current = animation;
    return () => {
      animation.cancel();
      animationRef.current = null;
    };
  }, [animate, copyWidth, signature]);

  if (items.length === 0) return null;
  const pause = () => animationRef.current?.pause();
  const play = () => animationRef.current?.play();

  return (
    <div role="region" aria-label="Announcements" className="mx-2 flex min-w-0 flex-1 items-center gap-2 text-label text-primary sm:mx-4">
      <Megaphone aria-hidden="true" className="h-4 w-4 shrink-0" />
      <div
        ref={viewportRef}
        tabIndex={overflowing ? 0 : undefined}
        onMouseEnter={pause} onMouseLeave={play} onFocus={pause} onBlur={play}
        className={`min-w-0 flex-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${reduced ? "overflow-x-auto" : "overflow-hidden"}`}
      >
        <div ref={trackRef} className="admin-announcement-scroll flex w-max items-center whitespace-nowrap font-medium">
          <div ref={copyRef} className="flex w-max shrink-0"><Messages items={items} /></div>
          {animate && <Messages items={items} hidden />}
        </div>
      </div>
    </div>
  );
}
