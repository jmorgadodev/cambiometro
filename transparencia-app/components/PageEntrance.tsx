"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface PageEntranceProps {
  children: ReactNode;
}

export default function PageEntrance({ children }: PageEntranceProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div ref={ref} className={`page-entrance${visible ? " is-visible" : ""}`}>
      {children}
    </div>
  );
}