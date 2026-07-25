// frontend/lib/api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export type BudgetRecommendInput = {
  monthly_income: number;
  expected_rent: number;
  existing_debt_payments: number;
  savings_goal: number;
};

export type BudgetRecommendOutput = {
  essential_pct: number;
  savings_pct: number;
  debt_pct: number;
  personal_pct: number;
};

export async function recommendBudget(
  input: BudgetRecommendInput
): Promise<BudgetRecommendOutput> {
  const res = await fetch(`${API_URL}/budget/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to get budget recommendation");
  return res.json();
}

export async function saveBudget(input: any) {
  const res = await fetch(`${API_URL}/budget`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to save budget");
  return res.json();
}

// frontend/lib/api.ts — add these to the existing file

export type Transaction = {
  id: string;
  user_id: string;
  merchant: string;
  description: string;
  amount: number;
  transaction_date: string;
  bucket: string | null;
  confidence: string;
};

export async function getTransactions(userId: string): Promise<Transaction[]> {
  const res = await fetch(`${API_URL}/transactions?user_id=${userId}`);
  if (!res.ok) throw new Error("Failed to fetch transactions");
  const data = await res.json();
  return data.transactions;
}

export async function updateTransactionBucket(id: string, bucket: string) {
  const res = await fetch(`${API_URL}/transactions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket }),
  });
  if (!res.ok) throw new Error("Failed to update transaction");
  return res.json();
}

export async function uploadStatement(userId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/transactions/upload?user_id=${userId}`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload statement");
  return res.json();
}

// frontend/lib/api.ts — add this

export type BucketBreakdown = {
  bucket: string;
  budgeted_pct: number;
  budgeted_amount: number;
  actual_amount: number;
  over_budget: boolean;
};

export type DashboardData = {
  total_income: number;
  total_expenses: number;
  total_deposits: number;
  savings_goal: number;
  bucket_breakdown: BucketBreakdown[];
  uncategorized_count: number;
};

export async function getDashboard(userId: string): Promise<DashboardData> {
  const res = await fetch(`${API_URL}/dashboard?user_id=${userId}`);
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  return res.json();
}