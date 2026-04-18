# Contributing to StadiumIQ

Thank you for your interest in contributing to StadiumIQ!

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Open `index.html` in a browser — no build tools required
4. Add your API keys to `config.js` (see README for instructions)

## Development Guidelines

### Code Style
- Use `const` and `let` — never `var`
- All functions must have JSDoc comments
- Follow the existing module section pattern in `app.js`
- Use `gcpLog()` instead of `console.log()` for application events

### Testing
- Add tests for any new feature in `tests/stadiumiq.test.js`
- Follow the existing `describe/it/expect` pattern
- Run tests with `Ctrl+Shift+T` in the browser

### Security
- All user inputs must pass through `sanitizeInput()`
- All dynamic HTML must use `escapeHtml()`
- Never add new API keys directly to code — use the CONFIG object

### Pull Requests
- Keep PRs focused on a single change
- Update README.md if you add a new feature
- Ensure all existing tests still pass before submitting

## Project Structure
stadiumiq/
├── index.html          # Main HTML shell
├── app.js              # Application logic (modular sections)
├── config.js           # API keys CONFIG object (not committed)
├── tests/
│   └── stadiumiq.test.js  # Full test suite (70+ tests)
├── Dockerfile          # Container definition for Cloud Run
├── nginx.conf          # nginx server config (port 8080)
├── manifest.json       # PWA manifest
├── .eslintrc.json      # ESLint configuration
├── .github/
│   └── workflows/
│       └── static-analysis.yml  # CI/CD pipeline
├── SECURITY.md         # Security policy
├── CONTRIBUTING.md     # This file
└── README.md           # Full project documentation
