# backend/categorizer.py
# backend/categorizer.py

CATEGORY_RULES = {
    "Essential Expenses": [
        "instacart",           # groceries
        "grocery",
        "safeway",
        "walmart",
        "superstore",
        "no frills",
        "rent",
        "electric",
        "water bill",
        "gas station",
        "pharmacy",
        "shoppers drug mart",
    ],
    "Debt Payments": [
        "loan",
        "credit card payment",
        "student loan",
        "auto loan",
        "line of credit",
    ],
    "Savings": [
        "transfer to savings",
        "savings deposit",
        "tfsa",
        "rrsp",
    ],
    "Personal Spending": [
        "daily grind",          # coffee shop seen in this statement
        "uberdirectca",         # Uber Eats/rides seen in this statement
        "uber",
        "netflix",
        "spotify",
        "restaurant",
        "amazon",
        "starbucks",
        "google*payments",      # app store / subscription charges seen in this statement
        "oliver square",        # local retail seen in this statement
    ],
}


def categorize_transaction(description: str, transaction_type: str = ""):
    """Match a transaction to a budget bucket using keyword rules.
    Checks both the merchant description and transaction type,
    since some banks put useful signal in either field."""
    combined = f"{description} {transaction_type}".lower()

    # Interac e-Transfers and generic withdrawals/deposits carry no merchant
    # info, so they're intentionally left for manual review rather than guessed.
    if "interac e-transfer" in combined:
        return None, "manual"

    for bucket, keywords in CATEGORY_RULES.items():
        for keyword in keywords:
            if keyword in combined:
                return bucket, "auto"

    return None, "manual"