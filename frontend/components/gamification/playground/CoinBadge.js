"use client";
import React, { useEffect, useRef, useState } from "react";
import { CoinIcon } from "@/lib/icons";

// The wallet pill. Pulses whenever the balance grows so earning coins always
// gets a little pop of acknowledgement, wherever it happens on the page.
export default function CoinBadge({ coins }) {
  const [bump, setBump] = useState(false);
  const prev = useRef(coins);

  useEffect(() => {
    if (coins > prev.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 500);
      prev.current = coins;
      return () => clearTimeout(t);
    }
    prev.current = coins;
  }, [coins]);

  return (
    <span className={"pg-wallet" + (bump ? " bump" : "")}>
      <CoinIcon size={16} />
      <strong>{coins.toLocaleString()}</strong>
    </span>
  );
}
