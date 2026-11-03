"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
type ConfirmLeave = (options: {
  title: string;
  message: string;
  label: string;
}) => Promise<boolean>;
/** Keep the current document alive while a same-document browser traversal is being confirmed. */
export function useUnsavedNavigation(
  dirty: boolean,
  confirm: ConfirmLeave,
  clear: () => void,
) {
  const router = useRouter();
  useEffect(() => {
    if (!dirty) return;
    const origin = location.href,
      originState = history.state;
    const navigation = (
      window as Window & {
        navigation?: EventTarget & { currentEntry?: { index: number } };
      }
    ).navigation;
    const originIndex = navigation?.currentEntry?.index;
    let replay = false,
      restoring = false,
      delta = 0;
    const ask = () =>
      confirm({
        title: "Leave without saving?",
        message:
          "Your unsaved edits will be discarded. Saved records will remain available.",
        label: "Discard changes",
      });
    const before = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const click = (e: MouseEvent) => {
      const a =
        e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (
        !(a instanceof HTMLAnchorElement) ||
        a.target === "_blank" ||
        a.hasAttribute("download") ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.button !== 0
      )
        return;
      const next = new URL(a.href);
      if (
        next.href === location.href ||
        (next.hash &&
          next.pathname === location.pathname &&
          next.search === location.search)
      )
        return;
      e.preventDefault();
      e.stopImmediatePropagation();
      void ask().then((ok) => {
        if (ok) {
          clear();
          if (next.origin === location.origin)
            router.push(next.pathname + next.search + next.hash);
          else location.assign(next.href);
        }
      });
    };
    // Cancel before Next.js can unmount the editor during a same-document traversal.
    const navigate = (event: Event) => {
      const e = event as Event & {
        navigationType: string;
        destination: { index: number; sameDocument: boolean; url: string };
      };
      if (
        e.navigationType !== "traverse" ||
        !e.cancelable ||
        !e.destination.sameDocument ||
        replay ||
        restoring ||
        e.destination.url === origin ||
        typeof originIndex !== "number"
      )
        return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const steps = e.destination.index - originIndex;
      void ask().then((ok) => {
        if (ok) {
          replay = true;
          clear();
          history.go(steps);
        }
      });
    };
    const pop = (e: PopStateEvent) => {
      if (replay) return;
      if (restoring) {
        e.stopImmediatePropagation();
        restoring = false;
        void ask().then((ok) => {
          if (ok) {
            replay = true;
            clear();
            history.go(delta);
          }
        });
        return;
      }
      if (location.href === origin) return;
      e.stopImmediatePropagation();
      const dest = location.href,
        currentIndex = navigation?.currentEntry?.index;
      if (
        typeof currentIndex === "number" &&
        typeof originIndex === "number" &&
        currentIndex !== originIndex
      ) {
        delta = currentIndex - originIndex;
        restoring = true;
        history.go(-delta);
        return;
      }
      // Older browsers lack the Navigation API's traversal index. Restore the current entry before displaying the dialog.
      history.pushState(originState, "", origin);
      void ask().then((ok) => {
        if (ok) {
          replay = true;
          clear();
          router.replace(dest);
        }
      });
    };
    navigation?.addEventListener("navigate", navigate, true);
    window.addEventListener("beforeunload", before);
    window.addEventListener("popstate", pop, true);
    document.addEventListener("click", click, true);
    return () => {
      navigation?.removeEventListener("navigate", navigate, true);
      window.removeEventListener("beforeunload", before);
      window.removeEventListener("popstate", pop, true);
      document.removeEventListener("click", click, true);
    };
  }, [dirty, confirm, clear, router]);
}
