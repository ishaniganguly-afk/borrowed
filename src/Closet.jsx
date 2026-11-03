import { useEffect, useState } from "react";
import { validateItem } from "../shared/item-validation.js";
import { findClosetItems } from "./closet-filters.js";

async function closetRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "Something went wrong. Please try again.");
    error.fieldErrors = data.fieldErrors;
    throw error;
  }
  return data;
}

function readRoute() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/items/new") return { type: "create" };
  if (path === "/starred") return { type: "list", starred: true };

  const editMatch = path.match(/^\/items\/([^/]+)\/edit$/);
  if (editMatch) return { type: "edit", id: editMatch[1] };

  const detailMatch = path.match(/^\/items\/([^/]+)$/);
  if (detailMatch) return { type: "detail", id: detailMatch[1] };

  return { type: "list" };
}

function Brand() {
  return (
    <a className="brand" href="/" aria-label="Borrowed home">
      <span className="brand-mark" aria-hidden="true">b.</span>
      <span>borrowed</span>
    </a>
  );
}

function formatPrice(value) {
  if (value === "" || value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
}

function ClosetHeader({ user, onLogout }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setBusy(true);
    setError("");
    try {
      await closetRequest("/api/auth/logout", { method: "POST" });
      window.history.pushState({}, "", "/");
      onLogout();
    } catch (requestError) {
      setError(requestError.message);
      setBusy(false);
    }
  }

  return (
    <>
      <header className="closet-header">
        <Brand />
        <div className="account-actions">
          <span className="account-email">{user.email}</span>
          <button className="logout-button" type="button" onClick={logout} disabled={busy}>
            {busy ? "Logging out…" : "Log out"}
          </button>
        </div>
      </header>
      {error && <p className="closet-global-error" role="alert">{error}</p>}
    </>
  );
}

function StarButton({ item, onToggle, busy }) {
  return (
    <button
      type="button"
      className={`item-star-button${item.starred ? " is-starred" : ""}`}
      aria-label={`${item.starred ? "Unstar" : "Star"} ${item.name}`}
      aria-pressed={item.starred}
      disabled={busy}
      onClick={() => onToggle(item)}
    >
      <span aria-hidden="true">{item.starred ? "★" : "☆"}</span>
    </button>
  );
}

function ItemGrid({ items, onOpen, onToggleStar, starring, starredOnly, filtered }) {
  if (items.length === 0) {
    return (
      <section className="closet-empty">
        <div className="placeholder-icon" aria-hidden="true">✳</div>
        <p className="placeholder-kicker">{filtered ? "Keep looking" : starredOnly ? "Your favorites" : "A fresh start"}</p>
        <h2>{filtered ? "No matching pieces." : starredOnly ? "No starred pieces yet." : "Your closet is ready for its first piece."}</h2>
        <p>{filtered ? "Try a different search or adjust your filters." : starredOnly ? "Star a piece from All items to find it here." : "Add an item and it’ll be waiting here whenever you need it."}</p>
      </section>
    );
  }

  return (
    <div className="item-grid">
      {items.map((item) => (
        <article className="item-card-shell" key={item.id}>
        <a
          className="item-card"
          href={`/items/${item.id}`}
          onClick={(event) => {
            event.preventDefault();
            onOpen(item.id);
          }}
        >
          <span className="item-card-category">{item.category}</span>
          <h2>{item.name}</h2>
          <div className="item-card-details">
            <span>{item.brand || "—"}</span>
            <span>{item.size || "—"}</span>
          </div>
          <span className="item-card-arrow" aria-hidden="true">↗</span>
        </a>
        <StarButton item={item} onToggle={onToggleStar} busy={starring} />
        </article>
      ))}
    </div>
  );
}

function ClosetList({ items, onAdd, onOpen, onToggleStar, starring, starredOnly, onViewChange, error, filters, onFiltersChange, categories }) {
  const filtered = Boolean(filters.query.trim() || filters.categoryId || filters.availableOnly);
  function updateFilter(event) {
    const { name, value, checked, type } = event.target;
    onFiltersChange((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }
  return (
    <section className="closet-content">
      <div className="closet-heading-row">
        <div>
          <p className="eyebrow">Your space</p>
          <h1 id="closet-title">My Closet<span>.</span></h1>
          <p className="closet-subtitle">
            {items.length === 1 ? "1 piece" : `${items.length} pieces`} {filtered ? `matching${starredOnly ? " in Starred" : ""}` : starredOnly ? "starred" : "in your closet"}
          </p>
        </div>
        <button className="item-primary-button" type="button" onClick={onAdd}>
          <span aria-hidden="true">＋</span> Add item
        </button>
      </div>
      <nav className="closet-views" aria-label="Closet views">
        <button type="button" aria-pressed={!starredOnly} onClick={() => onViewChange(false)}>All items</button>
        <button type="button" aria-pressed={Boolean(starredOnly)} onClick={() => onViewChange(true)}>Starred</button>
      </nav>
      <div className="closet-find-controls" role="search" aria-label="Find closet items">
        <label className="item-form-field">
          <span>Search</span>
          <input type="search" name="query" placeholder="Search name or brand" value={filters.query} onChange={updateFilter} />
        </label>
        <label className="item-form-field">
          <span>Category</span>
          <select name="categoryId" value={filters.categoryId} onChange={updateFilter}>
            <option value="">All categories</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label className="item-form-field">
          <span>Sort by</span>
          <select name="sort" value={filters.sort} onChange={updateFilter}>
            <option value="newest">Newest</option>
            <option value="price-desc">Price: high to low</option>
            <option value="price-asc">Price: low to high</option>
          </select>
        </label>
        <label className="item-lend-check">
          <input type="checkbox" name="availableOnly" checked={filters.availableOnly} onChange={updateFilter} />
          <span>Available to lend</span>
        </label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <ItemGrid items={items} onOpen={onOpen} onToggleStar={onToggleStar} starring={starring} starredOnly={starredOnly} filtered={filtered} />
    </section>
  );
}

function ItemDetails({ item, onBack, onEdit, onDelete, deleting, error, onToggleStar, starring }) {
  return (
    <section className="closet-content item-detail-page">
      <button className="text-back-button" type="button" onClick={onBack}>
        ← My Closet
      </button>
      <div className="item-detail-heading">
        <div>
          <p className="eyebrow">{item.category}</p>
          <h1>{item.name}<span>.</span></h1>
        </div>
        <div className="item-detail-actions">
          <StarButton item={item} onToggle={onToggleStar} busy={starring} />
          <button className="item-secondary-button" type="button" onClick={onEdit}>
            Edit
          </button>
          <button
            className="item-delete-button"
            type="button"
            onClick={onDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="item-detail-card">
        <dl className="item-detail-grid">
          <div><dt>Brand</dt><dd>{item.brand || "—"}</dd></div>
          <div><dt>Size</dt><dd>{item.size || "—"}</dd></div>
          <div><dt>Color</dt><dd>{item.color || "—"}</dd></div>
          <div><dt>Price</dt><dd>{formatPrice(item.price)}</dd></div>
          <div><dt>Purchased</dt><dd>{formatDate(item.purchasedOn)}</dd></div>
          <div>
            <dt>Available to lend</dt>
            <dd>{item.availableToLend ? "Yes" : "No"}</dd>
          </div>
          <div className="item-detail-notes">
            <dt>Fit notes</dt>
            <dd>{item.fitNotes || "—"}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function ItemForm({ item, categories, onCancel, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: item?.name ?? "",
    categoryId: item?.categoryId ? String(item.categoryId) : "",
    brand: item?.brand ?? "",
    size: item?.size ?? "",
    color: item?.color ?? "",
    price: item?.price ?? "",
    purchasedOn: item?.purchasedOn ?? "",
    fitNotes: item?.fitNotes ?? "",
    availableToLend: item?.availableToLend ?? false,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  function checkFields(values) {
    return validateItem(values, categories.map((category) => category.id));
  }

  function fieldError(name) {
    return fieldErrors[name] ? (
      <span className="item-field-error" id={`item-${name}-error`} role="alert">
        {fieldErrors[name]}
      </span>
    ) : null;
  }

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    const nextForm = {
      ...form,
      [name]: type === "checkbox" ? checked : value,
    };
    setForm(nextForm);
    if (submitted) {
      const problems = checkFields(nextForm);
      if (name === "price" && event.target.validity.badInput) {
        problems.price = "Please enter a valid price";
      }
      setFieldErrors(problems);
    }
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    setSubmitted(true);
    const problems = checkFields(form);
    if (event.currentTarget.elements.namedItem("price").validity.badInput) {
      problems.price = "Please enter a valid price";
    }
    setFieldErrors(problems);
    setError("");
    if (Object.keys(problems).length) {
      event.currentTarget.elements.namedItem(Object.keys(problems)[0])?.focus();
      return;
    }
    setSaving(true);
    try {
      const isEditing = Boolean(item);
      const { item: savedItem } = await closetRequest(
        isEditing ? `/api/items/${item.id}` : "/api/items",
        {
          method: isEditing ? "PUT" : "POST",
          body: JSON.stringify(form),
        },
      );
      onSaved(savedItem);
    } catch (requestError) {
      if (requestError.fieldErrors) {
        setFieldErrors(requestError.fieldErrors);
      } else {
        setError(requestError.message);
      }
      setSaving(false);
    }
  }

  return (
    <section className="closet-content item-form-page">
      <button className="text-back-button" type="button" onClick={onCancel}>
        ← My Closet
      </button>
      <p className="eyebrow">{item ? "Make it yours" : "A new favorite"}</p>
      <h1>{item ? "Edit item" : "Add to your closet"}<span>.</span></h1>

      <form className="item-form-card" onSubmit={handleSubmit} noValidate>
        <div className="item-form-grid">
          <label className="item-form-field">
            <span>Name</span>
            <input name="name" value={form.name} onChange={updateField} required
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "item-name-error" : undefined} />
            {fieldError("name")}
          </label>
          <label className="item-form-field">
            <span>Category</span>
            <select
              name="categoryId"
              value={form.categoryId}
              onChange={updateField}
              required
              aria-invalid={Boolean(fieldErrors.categoryId)}
              aria-describedby={fieldErrors.categoryId ? "item-categoryId-error" : undefined}
            >
              <option value="">Choose a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            {fieldError("categoryId")}
          </label>
          <label className="item-form-field">
            <span>Brand</span>
            <input name="brand" value={form.brand} onChange={updateField} />
          </label>
          <label className="item-form-field">
            <span>Size</span>
            <input name="size" value={form.size} onChange={updateField} required
              aria-invalid={Boolean(fieldErrors.size)}
              aria-describedby={fieldErrors.size ? "item-size-error" : undefined} />
            {fieldError("size")}
          </label>
          <label className="item-form-field">
            <span>Color</span>
            <input name="color" value={form.color} onChange={updateField} />
          </label>
          <label className="item-form-field">
            <span>Price</span>
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={updateField}
              aria-invalid={Boolean(fieldErrors.price)}
              aria-describedby={fieldErrors.price ? "item-price-error" : undefined}
            />
            {fieldError("price")}
          </label>
          <label className="item-form-field">
            <span>Purchase date</span>
            <input
              name="purchasedOn"
              type="date"
              value={form.purchasedOn}
              onChange={updateField}
            />
          </label>
          <label className="item-form-field item-form-notes">
            <span>Fit notes</span>
            <textarea
              name="fitNotes"
              rows="4"
              value={form.fitNotes}
              onChange={updateField}
            />
          </label>
        </div>

        <label className="item-lend-check">
          <input
            name="availableToLend"
            type="checkbox"
            checked={form.availableToLend}
            onChange={updateField}
          />
          <span>Available to lend</span>
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="item-form-actions">
          <button className="item-secondary-button" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="item-primary-button" type="submit" disabled={saving}>
            {saving ? "Saving…" : item ? "Save changes" : "Save item"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default function ClosetApp({ user, onLogout }) {
  const [route, setRoute] = useState(readRoute);
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({
    query: "", categoryId: "", availableOnly: false, sort: "newest",
  });
  const [categories, setCategories] = useState([]);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [starring, setStarring] = useState(false);
  const routeKey = `${route.type}:${route.id ?? ""}:${route.starred ? "starred" : "all"}`;

  function navigate(path) {
    window.history.pushState({}, "", path);
    setRoute(readRoute());
    setActionError("");
    window.scrollTo(0, 0);
  }

  useEffect(() => {
    function onPopState() {
      setRoute(readRoute());
      setActionError("");
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    setActionError("");
    setDeleting(false);
    setItem(null);

    async function loadRoute() {
      try {
        const { categories: loadedCategories } = await closetRequest("/api/categories");
        if (!active) return;
        setCategories(loadedCategories);

        if (route.type === "list") {
          const { items: loadedItems } = await closetRequest(route.starred ? "/api/items?starred=true" : "/api/items");
          if (active) setItems(loadedItems);
        } else if (route.type === "detail" || route.type === "edit") {
          const { item: loadedItem } = await closetRequest(`/api/items/${route.id}`);
          if (active) setItem(loadedItem);
        }
      } catch (error) {
        if (active) setLoadError(error.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRoute();
    return () => {
      active = false;
    };
  }, [routeKey]);

  async function deleteItem() {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    setDeleting(true);
    setActionError("");
    try {
      await closetRequest(`/api/items/${route.id}`, { method: "DELETE" });
      navigate("/");
    } catch (error) {
      setActionError(error.message);
      setDeleting(false);
    }
  }

  async function toggleStar(target) {
    if (starring) return;
    setStarring(true);
    setActionError("");
    try {
      const { starred } = await closetRequest(`/api/items/${target.id}/star`, {
        method: target.starred ? "DELETE" : "PUT",
      });
      setItems((current) => current
        .map((entry) => entry.id === target.id ? { ...entry, starred } : entry));
      setItem((current) => current?.id === target.id ? { ...current, starred } : current);
    } catch (error) {
      setActionError(error.message);
    } finally {
      setStarring(false);
    }
  }

  function handleSaved(savedItem) {
    navigate(`/items/${savedItem.id}`);
  }

  return (
    <main className="closet-page">
      <ClosetHeader user={user} onLogout={onLogout} />
      {loading ? (
        <div className="closet-loading" aria-live="polite">
          <span className="loading-mark">b.</span>
          <p>Opening your closet…</p>
        </div>
      ) : loadError ? (
        <section className="closet-content closet-state-message" role="alert">
          <p className="eyebrow">A little hiccup</p>
          <h1>We couldn’t open that page<span>.</span></h1>
          <p>{loadError}</p>
          <button className="item-secondary-button" type="button" onClick={() => navigate("/")}>
            Back to My Closet
          </button>
        </section>
      ) : route.type === "list" ? (
        <ClosetList
          items={findClosetItems(items, { ...filters, starredOnly: route.starred })}
          filters={filters}
          onFiltersChange={setFilters}
          categories={categories}
          onAdd={() => navigate("/items/new")}
          onOpen={(id) => navigate(`/items/${id}`)}
          onToggleStar={toggleStar}
          starring={starring}
          starredOnly={route.starred}
          onViewChange={(starred) => navigate(starred ? "/starred" : "/")}
          error={actionError}
        />
      ) : route.type === "create" || route.type === "edit" ? (
        <ItemForm
          key={routeKey}
          item={route.type === "edit" ? item : null}
          categories={categories}
          onCancel={() => navigate("/")}
          onSaved={handleSaved}
        />
      ) : item ? (
        <ItemDetails
          item={item}
          onBack={() => navigate("/")}
          onEdit={() => navigate(`/items/${item.id}/edit`)}
          onDelete={deleteItem}
          deleting={deleting}
          error={actionError}
          onToggleStar={toggleStar}
          starring={starring}
        />
      ) : null}
      <p className="closet-footer">Borrowed · Keep the good stuff close.</p>
    </main>
  );
}
