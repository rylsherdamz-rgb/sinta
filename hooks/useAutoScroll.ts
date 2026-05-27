"use client";

import { useEffect, useRef, useCallback } from "react";

export function useAutoScroll(deps: unknown[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    if (!containerRef.current || !shouldScrollRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom, ...deps]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    shouldScrollRef.current = atBottom;
  }, []);

  return { containerRef, handleScroll };
}