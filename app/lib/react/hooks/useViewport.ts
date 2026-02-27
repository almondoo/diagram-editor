import { useState, useEffect } from "react";

export interface ViewportInfo {
  width: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

const MOBILE_BREAKPOINT = 768;
const DESKTOP_BREAKPOINT = 1024;

function getInfo(w: number): ViewportInfo {
  return {
    width: w,
    isMobile: w < MOBILE_BREAKPOINT,
    isTablet: w >= MOBILE_BREAKPOINT && w < DESKTOP_BREAKPOINT,
    isDesktop: w >= DESKTOP_BREAKPOINT,
  };
}

export function useViewport(): ViewportInfo {
  const [info, setInfo] = useState<ViewportInfo>(() =>
    typeof window !== "undefined" ? getInfo(window.innerWidth) : getInfo(DESKTOP_BREAKPOINT)
  );

  useEffect(() => {
    let raf = 0;
    const handleResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setInfo(getInfo(window.innerWidth));
      });
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return info;
}
