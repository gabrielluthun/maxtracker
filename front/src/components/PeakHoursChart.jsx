import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function PeakHoursChart({ trips }) {
  const data = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
    for (const t of trips) {
      const h = parseInt((t.heure_depart || "0").slice(0, 2), 10);
      if (!Number.isNaN(h)) buckets[h].count += 1;
    }
    const max = Math.max(1, ...buckets.map((b) => b.count));
    return buckets.map((b) => ({ ...b, label: `${b.hour.toString().padStart(2, "0")}h`, intensity: b.count / max }));
  }, [trips]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5" data-testid="peak-hours-chart">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-semibold text-lg text-slate-900">Heures à forte probabilité de 0€</h3>
        <div className="text-xs text-slate-500">Répartition par heure de départ</div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} interval={1} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#0A2540", border: "none", borderRadius: 8, color: "white", fontSize: 12 }}
              labelStyle={{ color: "white", fontWeight: 600 }}
              cursor={{ fill: "rgba(10,37,64,0.05)" }}
              formatter={(v) => [`${v} train${v > 1 ? "s" : ""}`, "À 0€"]}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.intensity > 0.7 ? "#10B981" : d.intensity > 0.4 ? "#34D399" : d.intensity > 0 ? "#A7F3D0" : "#E2E8F0"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
