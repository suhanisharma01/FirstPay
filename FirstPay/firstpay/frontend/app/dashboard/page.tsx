// frontend/app/dashboard/page.tsx
"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getDashboard, DashboardData } from "@/lib/api";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#0f6e56", "#993c1d", "#185fa5", "#993556"];

// STEP 1: This becomes the new default export.
// It ONLY contains the Suspense wrapper — nothing else.
export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="max-w-3xl mx-auto py-16 px-4 text-gray-500">Loading...</p>}>
      <DashboardContent />
    </Suspense>
  );
}

// STEP 2: Everything that used to be inside DashboardPage's body
// (all the useState, useEffect, if-checks, and the big return JSX)
// moves into this new function instead.
function DashboardContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("user_id");

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getDashboard(userId)
      .then(setData)
      .catch(() => setError("Couldn't load dashboard."))
      .finally(() => setLoading(false));
  }, [userId]);

  if (!userId) {
    return (
      <main className="max-w-3xl mx-auto py-16 px-4">
        <p className="text-red-600">No user selected.</p>
      </main>
    );
  }

  if (loading) return <p className="max-w-3xl mx-auto py-16 px-4 text-gray-500">Loading...</p>;
  if (error) return <p className="max-w-3xl mx-auto py-16 px-4 text-red-600">{error}</p>;
  if (!data) return null;

  const pieData = data.bucket_breakdown
    .filter((b) => b.actual_amount > 0)
    .map((b) => ({ name: b.bucket, value: b.actual_amount }));

  return (
    <main className="max-w-3xl mx-auto py-16 px-4 space-y-10">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total income" value={`$${data.total_income.toFixed(2)}`} />
        <StatCard label="Total expenses" value={`$${data.total_expenses.toFixed(2)}`} />
        <StatCard label="Savings goal" value={`$${data.savings_goal.toFixed(2)}`} />
      </div>

      {data.uncategorized_count > 0 && (
        <p className="text-sm text-amber-600">
          {data.uncategorized_count} transaction{data.uncategorized_count > 1 ? "s" : ""} still need review — bucket totals below may not reflect all spending yet.
        </p>
      )}

      <section>
        <h2 className="text-lg font-medium mb-4">Budget vs actual</h2>
        <div className="space-y-4">
          {data.bucket_breakdown.map((b) => (
            <BucketBar key={b.bucket} bucket={b} />
          ))}
        </div>
      </section>

      {pieData.length > 0 && (
        <section>
          <h2 className="text-lg font-medium mb-4">Expense distribution</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} label>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </section>
      )}
    </main>
  );
}

// STEP 3: These helper components stay exactly where they were,
// completely unchanged, outside of both functions above.
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-lg p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function BucketBar({ bucket }: { bucket: any }) {
  const pct = bucket.budgeted_amount > 0
    ? Math.min((bucket.actual_amount / bucket.budgeted_amount) * 100, 150)
    : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{bucket.bucket}</span>
        <span className={bucket.over_budget ? "text-red-600" : "text-gray-600"}>
          ${bucket.actual_amount.toFixed(2)} / ${bucket.budgeted_amount.toFixed(2)}
          {bucket.over_budget && " — over budget"}
        </span>
      </div>
      <div className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded py-2 disabled:opacity-50 transition-colors">
        <div
          className={`h-2 rounded ${bucket.over_budget ? "bg-red-500" : "bg-black"}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}