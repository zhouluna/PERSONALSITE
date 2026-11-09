"use client";

import { useEffect, useRef } from "react";
import { FormulaField } from "@/components/formula-field";
import { useDesk } from "@/components/desk-context";

export function HomeStage() {
  const desk = useDesk();
  const stageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    function onMove(event: PointerEvent) {
      const rect = stage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      stage.style.setProperty("--look-x", x.toFixed(3));
      stage.style.setProperty("--look-y", y.toFixed(3));
    }
    stage.addEventListener("pointermove", onMove);
    return () => stage.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <main className="stage" ref={stageRef}>
      <FormulaField />
      <button type="button" className="shape-hit shape-hit-cat" aria-label="和机器猫聊天" onClick={() => desk.openChat("cat")} />
      <button type="button" className="shape-hit shape-hit-rabbit" aria-label="和机器兔聊天" onClick={() => desk.openChat("rabbit")} />
    </main>
  );
}
