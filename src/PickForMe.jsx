import { useState } from "react";
import { pickRandomItem } from "./random-item.js";

export default function PickForMe({ items, onOpen, filtered, starredOnly }) {
  const [pickedId, setPickedId] = useState(null);
  const [attempted, setAttempted] = useState(false);
  const picked = items.find((item) => item.id === pickedId);

  function pick() {
    setPickedId(pickRandomItem(items, pickedId)?.id ?? null);
    setAttempted(true);
  }

  return (
    <section className="closet-picker" aria-label="Pick an item for me">
      <button type="button" className="item-secondary-button" onClick={pick}>
        {attempted ? "Pick again" : "Pick for me"}
      </button>
      <div aria-live="polite">
        {attempted && (picked ? (
          <div className="closet-pick-result">
            <p className="eyebrow">How about this one?</p>
            <h2><a href={`/items/${picked.id}`} onClick={(event) => {
              event.preventDefault();
              onOpen(picked.id);
            }}>{picked.name} <span aria-hidden="true">↗</span></a></h2>
            <p>{picked.category}{picked.brand ? ` · ${picked.brand}` : ""}</p>
          </div>
        ) : (
          <p className="closet-pick-message">
            {items.length ? "Your selection changed. Pick again to choose a piece." :
              filtered ? "No pieces match your filters. Try another category or adjust your filters, then pick again." :
              starredOnly ? "No starred pieces yet. Star an item, then try picking again." :
              "Your closet is waiting for its first piece. Add an item, then try picking again."}
          </p>
        ))}
      </div>
    </section>
  );
}
