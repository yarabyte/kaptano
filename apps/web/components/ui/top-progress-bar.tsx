"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Barre de progression fine en haut de l'écran, affichée pendant les
 * navigations entre pages. Donne un retour visuel immédiat dès le clic,
 * avant même que le squelette (loading.tsx) ne s'affiche.
 *
 * Implémentation autonome (sans dépendance) : on démarre la barre au clic
 * sur un lien interne et on la termine au changement de `pathname`.
 */
export function TopProgressBar() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (safetyRef.current) {
      clearTimeout(safetyRef.current);
      safetyRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (tickRef.current) return; // déjà en cours
    if (hideRef.current) {
      clearTimeout(hideRef.current);
      hideRef.current = null;
    }
    setVisible(true);
    setProgress(8);
    tickRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        const inc = p < 40 ? 9 : p < 70 ? 4 : 1.5;
        return Math.min(90, p + inc);
      });
    }, 200);
    // Filet de sécurité : termine la barre si la navigation traîne.
    safetyRef.current = setTimeout(() => done(), 10000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const done = useCallback(() => {
    clearTimers();
    setProgress((p) => (p === 0 ? 0 : 100));
    hideRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 250);
  }, [clearTimers]);

  // Termine la barre quand l'URL a changé (navigation aboutie).
  useEffect(() => {
    done();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Démarre la barre au clic sur un lien interne vers une autre page.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (anchor.getAttribute("target") === "_blank") return;
      if (anchor.hasAttribute("download")) return;

      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        // Même page : pas de navigation de segment, on n'anime pas.
        if (url.pathname === window.location.pathname) return;
      } catch {
        return;
      }

      start();
    }

    function onPopState() {
      start();
    }

    document.addEventListener("click", onClick);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPopState);
      clearTimers();
      if (hideRef.current) clearTimeout(hideRef.current);
    };
  }, [start, clearTimers]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5"
      role="progressbar"
      aria-label="Chargement de la page"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
    >
      <div
        className="h-full bg-primary shadow-[0_0_8px_rgba(22,119,240,0.6)] transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1 }}
      />
    </div>
  );
}
