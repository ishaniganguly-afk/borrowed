import { useState } from "react";

export default function ShareCloset() {
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function share() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/share-link", {
        method: "POST", credentials: "same-origin",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "We couldn’t create your link. Please try again.");
      setLink(new URL(data.path, window.location.origin).href);
      setCopied(false);
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    setError("");
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError("Couldn’t copy automatically. You can select and copy the link below.");
    }
  }

  return (
    <section className="lending-share" aria-label="Share your lending closet">
      <button type="button" className="item-secondary-button" disabled={busy} onClick={share}>
        {busy ? "Creating link…" : "Share my lending closet"}
      </button>
      {link && (
        <div className="lending-share-link">
          <p>Anyone with this link can see only items marked available to lend. Your prices and email stay private.</p>
          <a href={link} target="_blank" rel="noreferrer">{link}</a>
          <button type="button" className="item-secondary-button" onClick={copy}>Copy link</button>
          {copied && <span role="status">Link copied!</span>}
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  );
}
