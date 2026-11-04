import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const monthLabel = (month) => new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", {
  month: "short", year: "numeric",
});

export default function Dashboard({ data }) {
  return (
    <section className="closet-content dashboard-page" aria-labelledby="dashboard-title">
      <p className="eyebrow">Your closet, in numbers</p>
      <h1 id="dashboard-title">Dashboard<span>.</span></h1>
      <div className="dashboard-stats">
        <div className="dashboard-stat"><h2>Total items</h2><p>{data.totalItems}</p></div>
        <div className="dashboard-stat"><h2>Total closet value</h2><p>{currency.format(data.totalClosetValue)}</p></div>
        <div className="dashboard-stat">
          <h2>Average cost per wear</h2>
          <p>{data.averageCostPerWear == null ? "—" : currency.format(data.averageCostPerWear)}</p>
          <small>Average of each priced, worn item’s cost per wear.</small>
        </div>
      </div>
      <section className="item-detail-card dashboard-chart" aria-labelledby="monthly-wears-title">
        <h2 id="monthly-wears-title">Wears per month</h2>
        <p>Your logged wears, grouped by month.</p>
        {data.wearsByMonth.length === 0 ? (
          <p className="dashboard-empty">No wears logged yet. Log a wear on an item to see it here.</p>
        ) : (
          <div className="dashboard-chart-frame">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.wearsByMonth} accessibilityLayer margin={{ top: 12, right: 16, left: 0, bottom: 12 }}>
                <CartesianGrid stroke="#e8dce3" vertical={false} />
                <XAxis dataKey="month" tickFormatter={monthLabel} stroke="#75697b" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} stroke="#75697b" tick={{ fontSize: 12 }} width={40} />
                <Tooltip labelFormatter={monthLabel} cursor={{ fill: "#fceaf1" }} formatter={(value) => [value, "Wears"]} />
                <Bar dataKey="wears" name="Wears" fill="#F0437F" radius={[6, 6, 0, 0]} maxBarSize={64} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </section>
  );
}
