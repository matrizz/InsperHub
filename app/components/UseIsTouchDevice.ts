import { useEffect, useState } from "react";

export function useIsTouchDevice(): boolean {
    const [isTouch, setIsTouch] = useState<boolean>(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(pointer: coarse)");
        setIsTouch(mediaQuery.matches);

        function handleChange(e: MediaQueryListEvent): void {
            setIsTouch(e.matches);
        }

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    return isTouch;
}