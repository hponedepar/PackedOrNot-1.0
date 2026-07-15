"use client";
import React, { useState } from "react";
import Card from "@/components/Card";
import { ACCESSORIES, THEMES } from "@/lib/playground";
import { CoinIcon, CheckIcon, LockIcon } from "@/lib/icons";

// The rewards vault: spend hard-earned coins on cosmetics that visibly change
// the companion (hats) and its home (themes). This is the long-term motivation
// loop — studying earns coins, coins unlock a study space you make your own —
// with zero impact on the actual learning. Rooms & avatars slot in here later.
function ItemGrid({ items, owned, equippedId, coins, onBuy, onEquip, render }) {
  return (
    <div className="pg-shop-grid">
      {items.map((it) => {
        const isOwned = owned.includes(it.id);
        const equipped = equippedId === it.id;
        const afford = coins >= it.cost;
        return (
          <div key={it.id} className={"pg-shop-item" + (equipped ? " equipped" : "")}>
            <div className="pg-shop-preview">{render(it)}</div>
            <div className="pg-shop-name small">{it.label}</div>
            {equipped ? (
              <span className="badge badge-green"><CheckIcon size={12} /> Worn</span>
            ) : isOwned ? (
              <button className="btn btn-sm" onClick={() => onEquip(it.id)}>Wear</button>
            ) : it.cost === 0 ? (
              <button className="btn btn-sm" onClick={() => onEquip(it.id)}>Use</button>
            ) : (
              <button className="btn btn-sm pg-buy" disabled={!afford} onClick={() => onBuy(it)}>
                {afford ? <><CoinIcon size={13} /> {it.cost}</> : <><LockIcon size={12} /> {it.cost}</>}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CustomizeCard({ pg, coins, onBuy, onEquipAccessory, onEquipTheme }) {
  const [tab, setTab] = useState("hats");

  return (
    <Card className="pg-shop">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <h2 className="card-title">Rewards vault</h2>
        <div className="pg-shop-tabs">
          <button className={"pg-tab" + (tab === "hats" ? " active" : "")} onClick={() => setTab("hats")}>Hats</button>
          <button className={"pg-tab" + (tab === "themes" ? " active" : "")} onClick={() => setTab("themes")}>Themes</button>
        </div>
      </div>

      {tab === "hats" ? (
        <ItemGrid
          items={ACCESSORIES}
          owned={pg.owned}
          equippedId={pg.accessory}
          coins={coins}
          onBuy={(it) => onBuy(it, "accessory")}
          onEquip={onEquipAccessory}
          render={(it) => <span className="pg-shop-emoji">{it.emoji || "🚫"}</span>}
        />
      ) : (
        <ItemGrid
          items={THEMES}
          owned={pg.owned}
          equippedId={pg.theme}
          coins={coins}
          onBuy={(it) => onBuy(it, "theme")}
          onEquip={onEquipTheme}
          render={(it) => <span className="pg-theme-swatch" style={{ background: it.grad }} />}
        />
      )}

      <div className="pg-shop-soon small muted">
        🛋️ Personal room &amp; avatar customisation coming soon — keep stacking coins.
      </div>
    </Card>
  );
}
