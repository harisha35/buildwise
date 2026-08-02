import csv
import io
from collections.abc import Iterable

from pydantic import BaseModel


def rows_to_csv(fieldnames: list[str], rows: Iterable[BaseModel]) -> str:
    """Serializes a list of Pydantic row models to CSV text using the given column order."""
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow(row.model_dump(mode="json"))
    return buffer.getvalue()
