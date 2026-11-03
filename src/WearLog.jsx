import { useEffect, useState } from "react";

function wearDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });
}

export default function WearLog({ itemId, request, onChanged }) {
  const [wears, setWears] = useState([]);
  const [wornOn, setWornOn] = useState("");
  const [occasion, setOccasion] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    request(`/api/items/${itemId}/wears`)
      .then((data) => { if (active) setWears(data.wears); })
      .catch((problem) => { if (active) setError(problem.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [itemId, request]);

  async function saveChange(method, suffix = "", body) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await request(`/api/items/${itemId}/wears${suffix}`, {
        method, ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (method === "POST") {
        setWornOn("");
        setOccasion("");
      }
      const { wears: updated } = await request(`/api/items/${itemId}/wears`);
      setWears(updated);
      await onChanged();
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="wear-log item-detail-card" aria-labelledby="wear-log-title">
      <h2 id="wear-log-title">Log a wear</h2>
      <form className="wear-log-form" onSubmit={(event) => {
        event.preventDefault();
        saveChange("POST", "", { wornOn, occasion });
      }}>
        <label className="item-form-field">
          <span>Date</span>
          <input type="date" value={wornOn} onChange={(event) => setWornOn(event.target.value)} required disabled={busy} />
        </label>
        <label className="item-form-field">
          <span>Event</span>
          <input value={occasion} onChange={(event) => setOccasion(event.target.value)} placeholder="Yosemite trip" required disabled={busy} />
        </label>
        <button type="submit" className="item-primary-button" disabled={busy}>{busy ? "Saving…" : "Log a wear"}</button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      <h3>Wear history</h3>
      {loading ? <p>Loading wear history…</p> : wears.length === 0 ? (
        <p>No wears logged yet.</p>
      ) : (
        <ul className="wear-history">
          {wears.map((wear) => (
            <li key={wear.id}>
              <div><time dateTime={wear.wornOn}>{wearDate(wear.wornOn)}</time><p>{wear.occasion}</p></div>
              <button type="button" className="item-delete-button" disabled={busy}
                aria-label={`Delete wear: ${wear.occasion} on ${wear.wornOn}`}
                onClick={() => saveChange("DELETE", `/${wear.id}`)}>Delete wear</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
