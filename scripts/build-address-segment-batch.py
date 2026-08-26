import csv
import re
import sys
import unicodedata


STORE_ID = "269f9a43-827a-4f4a-a2bd-9562bb514a13"


def sql_text(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def normalize(value: str) -> str:
    text = unicodedata.normalize("NFD", value.lower())
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = re.sub(r"\b(?:av|ave)\.?\b", "avenida", text)
    text = re.sub(r"\b(?:cl|cll)\.?\b", "calle", text)
    text = re.sub(r"\b(?:e/|ent)\b", "entre", text)
    text = re.sub(r"\besq\.?\b", "esquina", text)
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


source_path, offset_text, limit_text = sys.argv[1:4]
offset = int(offset_text)
limit = int(limit_text)

with open(source_path, newline="", encoding="utf-8-sig") as source:
    rows = list(csv.reader(source))[1:]

values_by_address = {}
for row in rows[offset : offset + limit]:
    display_address = row[6].strip()
    if not display_address:
        continue
    source_price = float(row[7] or 0)
    raw_distance = row[9].strip()
    if raw_distance == "-":
        continue
    distance_km = float(raw_distance) if raw_distance else max(0, 1 + (source_price - 200) / 100)
    zone = row[8].strip()
    normalized = normalize(display_address)
    search_text = normalize(" ".join([display_address, zone, *row[:6]]))
    values_by_address[normalized] = (
        "(" + ",".join([
            sql_text(STORE_ID) + "::uuid",
            sql_text(normalized),
            sql_text(search_text),
            sql_text(display_address),
            sql_text(zone) if zone else "null",
            str(round(distance_km * 1000)),
            str(round(source_price, 2)),
            "'csv_cienfuegos_express'",
        ]) + ")"
    )

print("insert into public.delivery_address_segments "
      "(store_id,normalized_address,search_text,display_address,zone_name,distance_meters,source_price,source) values\n" +
      ",\n".join(values_by_address.values()) +
      "\non conflict (store_id,normalized_address) do update set "
      "search_text=excluded.search_text,display_address=excluded.display_address,"
      "zone_name=excluded.zone_name,distance_meters=excluded.distance_meters,"
      "source_price=excluded.source_price,source=excluded.source,updated_at=now();")
