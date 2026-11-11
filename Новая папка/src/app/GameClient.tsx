"use client";

import { useEffect } from "react";
import "@fontsource/marck-script/cyrillic.css";
import "@fontsource/marck-script/latin.css";

let started = false;

export default function GameClient() {
  useEffect(() => {
    if (started) return;
    started = true;
    (async () => {
      const { MARKUP } = await import("@/game/markup");
      const root = document.getElementById("gameRoot");
      if (root) root.innerHTML = MARKUP;
      const [{ startGame }, { iconizeDom }] = await Promise.all([
        import("@/game/game"),
        import("@/game/icons"),
      ]);
      startGame();
      iconizeDom(document.body);
    })();
  }, []);

  return <div id="gameRoot" suppressHydrationWarning />;
}
