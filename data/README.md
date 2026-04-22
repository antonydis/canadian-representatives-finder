# Data Directory

## Structure

```
data/
├── cache/          Live API responses cached for 24 hours (gitignored)
└── examples/
    └── quebec_sample.json   Pre-fetched demo data for H2X 1Y6 (Montréal)
```

## Data Source

All representative data is fetched live from the **Represent API** by OpenNorth:

- **URL:** https://represent.opennorth.ca
- **Endpoint:** `GET /postcodes/{POSTAL_CODE}/`
- **Authentication:** None required
- **Rate limit:** 60 requests/minute
- **Coverage:** All federal MPs, all provincial MNAs/MLAs/MPPs, 7,000+ mayors and councillors

## Cache

The `cache/` directory stores API responses as JSON files named `{POSTAL_CODE}.json`
(e.g., `H2X_1Y6.json`). Each file contains a `_cached_at` timestamp; results older
than 24 hours are automatically refreshed. The cache directory is gitignored.

## Examples

`examples/quebec_sample.json` is a real API response snapshot for postal code
**H2X 1Y6** (Montréal, Plateau-Mont-Royal) and demonstrates the data structure
for all three government levels.
