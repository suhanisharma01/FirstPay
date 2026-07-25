
# FirstPay

A budgeting app built for first-time earners — people getting their first paycheck who have never built a budget before and don't know where to start.

## The problem

Budgeting apps assume you already know how to budget. FirstPay doesn't. Tell it your income, rent, debt, and savings goal, and it recommends a starting budget across four simple buckets. Upload a bank statement and it automatically sorts your real spending into those same buckets, so you can see — in one glance — where your plan and your reality diverge.

## How it works

1. **Set up your budget** — enter income, rent, debt payments, and a savings goal. FirstPay recommends a percentage split across four buckets: Essential Expenses, Savings, Debt Payments, and Personal Spending. Adjust with sliders until it feels right.
2. **Upload a bank statement (PDF)** — the backend parses real transaction data (date, merchant, amount) directly out of the PDF.
3. **Automatic categorization** — each transaction is sorted into a budget bucket using a three-layer system:
   - **Merchant memory**: if you've manually categorized this exact merchant before, it's applied automatically.
   - **Keyword rules**: common merchants and transaction types (groceries, subscriptions, transfers) are matched against a rule set.
   - **Manual review**: anything ambiguous (like a generic e-transfer with no merchant info) is flagged for you to categorize yourself — and that correction feeds back into merchant memory for next time.
4. **Dashboard** — total income, total expenses, savings progress, a budget-vs-actual breakdown per bucket (with over-budget categories flagged), and a pie chart of expense distribution.

Activate venv:
 Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
>> .\.venv\Scripts\Activate.ps1

back end - http://127.0.0.1:8000/docs to run: uvicorn main:app in backend folder
front end - http://localhost:3000/  to run: npm run dev in front end folder

## Tech stack

**Frontend**: Next.js, React, TypeScript, Tailwind CSS, Recharts
**Backend**: Python, FastAPI, PyMuPDF (PDF parsing), Supabase (Postgres + storage)

## What's built

- End-to-end budget creation flow with adjustable sliders
- PDF statement parsing tuned against a real bank statement format (multi-line transaction layout, auto-detected statement year)
- Three-layer categorization (merchant memory → keyword rules → manual review)
- Manual review UI with live bucket reassignment
- Dashboard with budget-vs-actual comparison and expense distribution chart

## Why this design

We intentionally scoped categorization around what's reliable with almost no training data: exact merchant matching from a user's own past decisions is a strong, low-effort signal, and it gets better every single time a user corrects a transaction — no retraining pipeline required. It was the right tradeoff for a one-day build, and it's designed to slot an ML layer in later without changing the API contract the frontend depends on.