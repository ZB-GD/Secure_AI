import csv
from pathlib import Path

DATASET = Path('/home/lab/data/train.csv')

suspicious_terms = [
    'ignore previous instructions',
    'admin token',
    'free gift',
]


def main():
    if not DATASET.exists():
        print(f'Dataset not found: {DATASET}')
        return

    suspicious = []
    with DATASET.open(newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            text = (row.get('text') or '').lower()
            label = (row.get('label') or '').lower().strip()
            score = sum(term in text for term in suspicious_terms)

            # Heuristic: suspicious prompt-like content or inconsistent sentiment label.
            inconsistent = ('worst' in text or 'terrible' in text) and label == 'positive'
            if score > 0 or inconsistent:
                suspicious.append(row)

    print('=== Suspicious rows ===')
    for row in suspicious:
        print(row)

    print(f'\nTotal suspicious: {len(suspicious)}')


if __name__ == '__main__':
    main()
