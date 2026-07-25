# backend/main.py
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi import UploadFile, File
from pdf_parser import extract_transactions
from categorizer import categorize_transaction
from db import supabase
from pydantic import BaseModel

app = FastAPI()

VALID_BUCKETS = {"Essential Expenses", "Savings", "Debt Payments", "Personal Spending"}

class BucketUpdate(BaseModel):
    bucket: str

# backend/main.py — add this endpoint

BUCKETS = ["Essential Expenses", "Savings", "Debt Payments", "Personal Spending"]

@app.get("/dashboard")
def get_dashboard(user_id: str = Query(...)):
    try:
        # 1. Get the user's income and latest budget
        user_result = supabase.table("users").select("*").eq("id", user_id).execute()
        if not user_result.data:
            raise HTTPException(status_code=404, detail="User not found")
        user = user_result.data[0]

        budget_result = (
            supabase.table("budgets")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not budget_result.data:
            raise HTTPException(status_code=404, detail="No budget found for this user")
        budget = budget_result.data[0]

        # 2. Get all transactions
        txn_result = (
            supabase.table("transactions")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        transactions = txn_result.data

        # 3. Compute totals
        total_income = user["monthly_income"]
        total_expenses = sum(abs(t["amount"]) for t in transactions if t["amount"] < 0)
        total_deposits = sum(t["amount"] for t in transactions if t["amount"] > 0)

        bucket_pct_map = {
            "Essential Expenses": budget["essential_pct"],
            "Savings": budget["savings_pct"],
            "Debt Payments": budget["debt_pct"],
            "Personal Spending": budget["personal_pct"],
        }

        bucket_breakdown = []
        for bucket in BUCKETS:
            budgeted_pct = bucket_pct_map[bucket]
            budgeted_amount = round(total_income * budgeted_pct / 100, 2)
            actual_amount = round(
                sum(abs(t["amount"]) for t in transactions if t["bucket"] == bucket and t["amount"] < 0),
                2,
            )
            bucket_breakdown.append({
                "bucket": bucket,
                "budgeted_pct": budgeted_pct,
                "budgeted_amount": budgeted_amount,
                "actual_amount": actual_amount,
                "over_budget": actual_amount > budgeted_amount,
            })

        uncategorized_count = sum(1 for t in transactions if not t["bucket"])

        return {
            "total_income": total_income,
            "total_expenses": round(total_expenses, 2),
            "total_deposits": round(total_deposits, 2),
            "savings_goal": user["savings_goal"],
            "bucket_breakdown": bucket_breakdown,
            "uncategorized_count": uncategorized_count,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/transactions/{transaction_id}")
def update_transaction_bucket(transaction_id: str, data: BucketUpdate):
    if data.bucket not in VALID_BUCKETS:
        raise HTTPException(status_code=400, detail=f"Bucket must be one of {VALID_BUCKETS}")

    try:
        result = (
            supabase.table("transactions")
            .update({"bucket": data.bucket, "confidence": "manual_corrected"})
            .eq("id", transaction_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Transaction not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    
class BudgetInput(BaseModel):
    monthly_income: float
    expected_rent: float
    existing_debt_payments: float
    savings_goal: float

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-vercel-url.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class BudgetSaveInput(BaseModel):
    name: str
    monthly_income: float
    expected_rent: float
    existing_debt_payments: float
    savings_goal: float
    essential_pct: float
    savings_pct: float
    debt_pct: float
    personal_pct: float

@app.get("/")
def health_check():
    return {"status": "ok"}

@app.get("/transactions")
def get_transactions(user_id: str = Query(...)):
    try:
        result = (
            supabase.table("transactions")
            .select("*")
            .eq("user_id", user_id)
            .order("transaction_date", desc=True)
            .execute()
        )
        return {"transactions": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/budget/recommend")
def recommend_budget(data: BudgetInput):
    essential_pct = round((data.expected_rent / data.monthly_income) * 100 + 20, 1)  # rent + other essentials estimate
    savings_pct = round((data.savings_goal / data.monthly_income) * 100, 1)
    debt_pct = round((data.existing_debt_payments / data.monthly_income) * 100, 1)
    personal_pct = round(100 - essential_pct - savings_pct - debt_pct, 1)

    return {
        "essential_pct": essential_pct,
        "savings_pct": savings_pct,
        "debt_pct": debt_pct,
        "personal_pct": max(personal_pct, 0),
    }

@app.post("/budget")
def save_budget(data: BudgetSaveInput):
    # Validate percentages sum to ~100
    total_pct = data.essential_pct + data.savings_pct + data.debt_pct + data.personal_pct
    if not (99 <= total_pct <= 101):  # small tolerance for rounding
        raise HTTPException(status_code=400, detail=f"Percentages must sum to 100, got {total_pct}")

    try:
        # 1. Insert the user
        user_response = supabase.table("users").insert({
            "name": data.name,
            "monthly_income": data.monthly_income,
            "expected_rent": data.expected_rent,
            "existing_debt_payments": data.existing_debt_payments,
            "savings_goal": data.savings_goal,
        }).execute()

        user_id = user_response.data[0]["id"]

        # 2. Insert the budget, linked to that user
        budget_response = supabase.table("budgets").insert({
            "user_id": user_id,
            "essential_pct": data.essential_pct,
            "savings_pct": data.savings_pct,
            "debt_pct": data.debt_pct,
            "personal_pct": data.personal_pct,
        }).execute()

        return {
            "user_id": user_id,
            "budget": budget_response.data[0],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/transactions/upload")
async def upload_statement(user_id: str, file: UploadFile = File(...)):
    pdf_bytes = await file.read()
    raw_transactions = extract_transactions(pdf_bytes)

    saved = []
    for txn in raw_transactions:
        bucket, confidence = categorize_transaction(txn["description"])

        result = supabase.table("transactions").insert({
            "user_id": user_id,
            "merchant": txn["merchant"],
            "description": txn["description"],
            "amount": txn["amount"] if txn["direction"] == "deposit" else -txn["amount"],
            "transaction_date": txn["transaction_date"],
            "bucket": bucket,
            "confidence": confidence,
        }).execute()

        saved.append(result.data[0])

    return {"count": len(saved), "transactions": saved}