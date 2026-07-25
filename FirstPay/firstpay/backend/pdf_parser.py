import fitz
import re

MONTHS = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec"
DATE_RE = re.compile(rf"^({MONTHS})\s+(\d{{1,2}})$")
NUMBER_RE = re.compile(r"^\$?[\d,]+\.\d{2}$")
YEAR_RE = re.compile(rf"({MONTHS})\s+\d{{1,2}},\s*(\d{{4}})")


def detect_statement_year(full_text: str) -> int:
    """Pull the year from a line like 'Opening Balance on January 21, 2026'.
    Falls back to the current year if no match is found."""
    match = YEAR_RE.search(full_text)
    if match:
        return int(match.group(2))
    from datetime import date
    return date.today().year


def extract_transactions(pdf_bytes: bytes):
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    full_text = ""
    lines = []
    for page in doc:
        page_text = page.get_text()
        full_text += page_text + "\n"
        lines.extend([l.strip() for l in page_text.split("\n") if l.strip()])

    year = detect_statement_year(full_text)

    transactions = []
    prev_balance = None
    i = 0
    while i < len(lines):
        date_match = DATE_RE.match(lines[i])
        if date_match:
            month, day = date_match.groups()
            txn_type = lines[i + 1] if i + 1 < len(lines) else ""

            if txn_type in ("Opening Balance", "Closing Balance"):
                balance_line = lines[i + 2] if i + 2 < len(lines) else None
                if balance_line and NUMBER_RE.match(balance_line):
                    prev_balance = float(balance_line.replace("$", "").replace(",", ""))
                i += 3
                continue

            amount_line = lines[i + 2] if i + 2 < len(lines) else None
            balance_line = lines[i + 3] if i + 3 < len(lines) else None

            if not (amount_line and NUMBER_RE.match(amount_line)):
                i += 1
                continue

            amount = float(amount_line.replace("$", "").replace(",", ""))
            balance = None
            if balance_line and NUMBER_RE.match(balance_line):
                balance = float(balance_line.replace("$", "").replace(",", ""))

            description = ""
            next_idx = i + 4
            if next_idx < len(lines) and not DATE_RE.match(lines[next_idx]):
                description = lines[next_idx]
                consumed = 5
            else:
                consumed = 4

            direction = "withdrawal"
            if balance is not None and prev_balance is not None:
                direction = "deposit" if balance > prev_balance else "withdrawal"
            elif "deposit" in txn_type.lower():
                direction = "deposit"

            if balance is not None:
                prev_balance = balance

            month_num = MONTHS.split("|").index(month) + 1
            transactions.append({
                "transaction_date": f"{year}-{month_num:02d}-{int(day):02d}",
                "transaction_type": txn_type,
                "amount": amount,
                "balance": balance,
                "direction": direction,
                "description": description,
                "merchant": description.split(" - ")[0] if description else txn_type,
            })
            i += consumed
        else:
            i += 1

    return transactions