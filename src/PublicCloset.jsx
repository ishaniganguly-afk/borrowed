import { useEffect, useState } from "react";

export default function PublicCloset({ slug }) {
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading");
  useEffect(() => {
    let active = true;
    setState("loading");
    fetch(`/api/public/closets/${encodeURIComponent(slug)}`, {
      credentials: "omit", cache: "no-store",
    }).then(async (response) => {
      if (response.status === 404) {
        if (active) setState("not-found");
        return;
      }
      if (!response.ok) throw new Error("Unable to load closet");
      const data = await response.json();
      if (active) {
        setItems(data.items);
        setState("ready");
      }
    }).catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, [slug]);

  return (
    <main className="closet-page">
      <header className="closet-header">
        <a className="brand" href="/" aria-label="Borrowed home">
          <span className="brand-mark" aria-hidden="true">b.</span><span>borrowed</span>
        </a>
      </header>
      <section className="closet-content public-closet" aria-live="polite">
        <p className="eyebrow">Good pieces, shared</p>
        <h1>{state === "not-found" ? "Closet not found" : "Lending closet"}<span>.</span></h1>
        {state === "loading" ? <p>Opening this lending closet…</p> :
          state === "not-found" ? <p>This link doesn’t match a closet. Check the link with the person who shared it.</p> :
          state === "error" ? <p>We couldn’t load this closet. Please refresh and try again.</p> : (
            <>
              <p>These pieces are available to lend.</p>
              {items.length === 0 ? <p>No pieces are available to lend right now. Check back soon.</p> : (
                <div className="item-grid">
                  {items.map((item, index) => (
                    <article className="item-card public-item-card" key={index}>
                      <span className="item-card-category">{item.category}</span>
                      <h2>{item.name}</h2>
                      <dl>
                        <div><dt>Brand</dt><dd>{item.brand || "—"}</dd></div>
                        <div><dt>Size</dt><dd>{item.size || "—"}</dd></div>
                        <div><dt>Color</dt><dd>{item.color || "—"}</dd></div>
                        <div><dt>Fit notes</dt><dd>{item.fitNotes || "—"}</dd></div>
                      </dl>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
      </section>
      <p className="closet-footer">Borrowed · Keep the good stuff close.</p>
    </main>
  );
}
