# Contributing / Contribuer

Thank you for your interest in contributing! / Merci de votre intérêt pour ce projet !

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/canadian-representatives-finder.git`
3. Install dependencies: `pip install -r requirements.txt`
4. Create a branch: `git checkout -b feature/my-improvement`

## Running Tests

```bash
pytest tests/ -v
```

All tests must pass before submitting a pull request.

## Guidelines

- Keep functions focused and small
- Add tests for new functionality
- Update documentation when adding features
- Use UTF-8 encoding for all file I/O (accented characters in French names)
- The Represent API has a 60 req/min rate limit — respect it in scripts

## Common Contribution Ideas

- Add support for more provinces in the examples
- Improve the `_classify_level` logic for edge cases
- Add a `--demo` flag to use the local Quebec sample without API calls
- Add a map visualization feature
- Create a simple web interface

## Data Accuracy

Representative data comes from the Represent API and reflects official government sources.
If you notice outdated data, please [contact OpenNorth](https://represent.opennorth.ca/api/)
as they maintain the database.

## Code of Conduct

Be respectful and constructive. This project is meant to improve civic access to information
for all Canadians.
