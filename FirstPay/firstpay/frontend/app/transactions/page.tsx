// frontend/app/transactions/page.tsx
"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Transaction,
  getTransactions,
  updateTransactionBucket,
  uploadStatement,
} from "@/lib/api";

const BUCKETS = ["Essential Expenses", "Savings", "Debt Payments", "Personal Spending"];

export default function TransactionsPage() {
  return (
    <Suspense fallback={<p className="max-w-3xl mx-auto py-16 px-4 text-gray-500">Loading...</p>}>
      <TransactionsContent />
    </Suspense>
  );
}

function TransactionsContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("user_id");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function loadTransactions() {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getTransactions(userId);
      setTransactions(data);
    } catch (err) {
      setError("Couldn't load transactions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, [userId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    setError("");
    try {
      await uploadStatement(userId, file);
      await loadTransactions();
    } catch (err) {
      setError("Couldn't upload statement.");
    } finally {
      setUploading(false);
    }
  }

  async function handleBucketChange(id: string, bucket: string) {
    try {
      await updateTransactionBucket(id, bucket);
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, bucket, confidence: "manual_corrected" } : t))
      );
    } catch (err) {
      setError("Couldn't update category.");
    }
  }

  if (!userId) {
    return (
      <main className="max-w-3xl mx-auto py-16 px-4">
        <p className="text-red-600">
          No user selected. Please complete your budget setup first.
        </p>
      </main>
    );
  }

  const needsReview = transactions.filter((t) => !t.bucket);
  const categorized = transactions.filter((t) => t.bucket);

  return (
    <main className="max-w-3xl mx-auto py-16 px-4">
      <h1 className="text-2xl font-semibold mb-6">Transactions</h1>

      <a href={`/dashboard?user_id=${userId}`} className="text-sm text-blue-600 underline">
        View dashboard →
      </a>

      <div className="my-8">
        <label className="block mb-2 text-sm text-gray-600">Upload bank statement (PDF)</label>
        <input type="file" accept=".pdf" onChange={handleUpload} disabled={uploading} />
        {uploading && <p className="text-sm text-gray-500 mt-2">Uploading and categorizing...</p>}
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {loading && <p className="text-gray-500">Loading...</p>}

      {needsReview.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-medium mb-3">
            Needs review ({needsReview.length})
          </h2>
          <TransactionTable
            transactions={needsReview}
            onBucketChange={handleBucketChange}
          />
        </section>
      )}

      {categorized.length > 0 && (
        <section>
          <h2 className="text-lg font-medium mb-3">Categorized</h2>
          <TransactionTable
            transactions={categorized}
            onBucketChange={handleBucketChange}
          />
        </section>
      )}
    </main>
  );
}

function TransactionTable({
  transactions,
  onBucketChange,
}: {
  transactions: Transaction[];
  onBucketChange: (id: string, bucket: string) => void;
}) {
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="text-left text-gray-500 border-b">
          <th className="py-2">Date</th>
          <th className="py-2">Description</th>
          <th className="py-2 text-right">Amount</th>
          <th className="py-2">Bucket</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((t) => (
          <tr key={t.id} className="border-b">
            <td className="py-2">{t.transaction_date}</td>
            <td className="py-2">{t.merchant}</td>
            <td className={`py-2 text-right ${t.amount < 0 ? "text-red-600" : "text-green-600"}`}>
              {t.amount < 0 ? "-" : "+"}${Math.abs(t.amount).toFixed(2)}
            </td>
            <td className="py-2">
              <select
                value={t.bucket || ""}
                onChange={(e) => onBucketChange(t.id, e.target.value)}
                className="border rounded px-2 py-1"
              >
                <option value="" disabled>
                  Select bucket
                </option>
                {BUCKETS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
