# Canadian Postal Code to District Mapping

## Problem

Full 6-digit postal code to electoral district mapping is proprietary (Canada Post). 

## Solution: Two-Tier Approach

### Tier 1: FSA (3-digit) to Districts

Map Forward Sortation Areas to candidate districts:

```python
class PostalCodeMapper:
    def __init__(self, data_path="data/fsa_to_fed.json"):
        with open(data_path) as f:
            self.fsa_map = json.load(f)
    
    def get_districts(self, postal_code):
        pc = postal_code.upper().replace(" ", "")
        fsa = pc[:3]
        return self.fsa_map.get(fsa, [])
```

### Tier 2: User Disambiguation

When FSA maps to multiple districts, show all candidates for user selection.

## Data Sources

| Resource | Coverage | Access |
|----------|----------|--------|
| Statistics Canada PCCF | Full 6-digit | Free (academic) |
| Elections Canada | FED boundaries | Public |
| Open North Represent | FSA mapping | Open API |
| GeoCoder.ca | Full 6-digit | Free API |

## Recommended Approach

1. Build FSA-to-FED mapping from open boundary data
2. For ambiguous FSAs, provide selection UI
3. Optionally integrate GeoCoder.ca for full resolution

## References

- [Elections Canada](https://www.elections.ca/)
- [Statistics Canada PCCF](https://www150.statcan.gc.ca/n1/en/catalogue/92-154-X)
- [Open North Represent](https://represent.opennorth.ca/)
