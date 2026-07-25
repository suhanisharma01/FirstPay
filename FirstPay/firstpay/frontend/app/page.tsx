"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recommendBudget, saveBudget, BudgetRecommendOutput } from "@/lib/api";

type Step = "form" | "sliders" | "done";

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedUserId, setSavedUserId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [income, setIncome] = useState("");
  const [rent, setRent] = useState("");
  const [debt, setDebt] = useState("");
  const [savingsGoal, setSavingsGoal] = useState("");

  const [pcts, setPcts] = useState<BudgetRecommendOutput>({
    essential_pct: 0,
    savings_pct: 0,
    debt_pct: 0,
    personal_pct: 0,
  });

  const total = pcts.essential_pct + pcts.savings_pct + pcts.debt_pct + pcts.personal_pct;

  async function handleGetRecommendation(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await recommendBudget({
        monthly_income: Number(income),
        expected_rent: Number(rent),
        existing_debt_payments: Number(debt),
        savings_goal: Number(savingsGoal),
      });
      setPcts(result);
      setStep("sliders");
    } catch (err) {
      setError("Couldn't get a recommendation. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setError("");
    setLoading(true);
    try {
      const result = await saveBudget({
        name,
        monthly_income: Number(income),
        expected_rent: Number(rent),
        existing_debt_payments: Number(debt),
        savings_goal: Number(savingsGoal),
        ...pcts,
      });
      setSavedUserId(result.user_id);
      setStep("done");
    } catch (err) {
      setError("Couldn't save your budget. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function updatePct(key: keyof BudgetRecommendOutput, value: number) {
    setPcts((prev) => ({ ...prev, [key]: value }));
  }

  function goToTransactions() {
    if (savedUserId) {
      router.push(`/transactions?user_id=${savedUserId}`);
    }
  }

  return (
    <main className="max-w-md mx-auto py-16 px-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8"></div>
        <h1 className="text-2xl font-semibold mb-8">FirstPay</h1>

      {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}

      {step === "form" && (
        <form onSubmit={handleGetRecommendation} className="space-y-4">
          <Input label="Name" value={name} onChange={setName} />
          <Input label="Monthly income" value={income} onChange={setIncome} type="number" />
          <Input label="Expected rent" value={rent} onChange={setRent} type="number" />
          <Input label="Existing debt payments" value={debt} onChange={setDebt} type="number" />
          <Input label="Savings goal" value={savingsGoal} onChange={setSavingsGoal} type="number" />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white rounded py-2 disabled:opacity-50"
          >
            {loading ? "Calculating..." : "Get recommendation"}
          </button>
        </form>
      )}

      {step === "sliders" && (
        <div className="space-y-6">
          <Slider label="Essential expenses" value={pcts.essential_pct} onChange={(v) => updatePct("essential_pct", v)} />
          <Slider label="Savings" value={pcts.savings_pct} onChange={(v) => updatePct("savings_pct", v)} />
          <Slider label="Debt payments" value={pcts.debt_pct} onChange={(v) => updatePct("debt_pct", v)} />
          <Slider label="Personal spending" value={pcts.personal_pct} onChange={(v) => updatePct("personal_pct", v)} />

          <p className={`text-sm ${Math.abs(total - 100) > 1 ? "text-red-600" : "text-green-600"}`}>
            Total: {Math.round(total)}%
          </p>

          <button
            onClick={handleSave}
            disabled={loading || Math.abs(total - 100) > 1}
            className="w-full bg-black text-white rounded py-2 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save budget"}
          </button>
        </div>
      )}

      {step === "done" && (
        <div className="space-y-4">
          <p className="text-green-600">Your budget has been saved.</p>
          <button
            onClick={goToTransactions}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded py-2 disabled:opacity-50 transition-colors"
          >
            Upload a bank statement →
          </button>
        </div>
      )}
    </main>
  );
}
function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-gray-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full border rounded px-3 py-2 mt-1"
      />
    </label>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm text-gray-600">
        {label}: {Math.round(value)}%
      </span>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  );
}