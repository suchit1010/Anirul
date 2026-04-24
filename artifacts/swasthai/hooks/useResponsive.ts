import { useWindowDimensions } from "react-native";

export type Breakpoint = "phone" | "tablet" | "desktop";

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  let bp: Breakpoint = "phone";
  if (width >= 1024) bp = "desktop";
  else if (width >= 700) bp = "tablet";

  return {
    width,
    height,
    bp,
    isPhone: bp === "phone",
    isTablet: bp === "tablet",
    isDesktop: bp === "desktop",
    isWide: bp !== "phone",
  };
}
