# Enhanced Grid Panel - Documentation

User documentation for the Enhanced Grid Panel.

## User Guides

- **[FEATURES.md](FEATURES.md)** - Complete feature guide covering all panel capabilities
- **[SERVER_SIDE_SETUP.md](SERVER_SIDE_SETUP.md)** - Detailed server-side configuration guide
- **[QUICK_START_SERVER_SIDE.md](QUICK_START_SERVER_SIDE.md)** - Quick 5-minute server-side setup

## Feature-Specific Guides

The comprehensive [FEATURES.md](FEATURES.md) guide covers:

- Column Filtering
- Pagination (Client-Side & Server-Side)
- Cell Highlighting & Formatting
- Server-Side Operations
- Advanced Features & Troubleshooting

For legacy documentation that may still be useful for specific advanced scenarios, check the git history.

## Development Documentation

Development-related documentation has been moved:

- See [../.config/README.md](../.config/README.md) for development setup
- See [../.config/AGENTS/instructions.md](../.config/AGENTS/instructions.md) for agent guidelines

## Screenshots

Screenshots for documentation should be placed in `screenshots/` directory.

To generate screenshots automatically, run:

```bash
npm run e2e -- tests/screenshots.spec.ts
```

Screenshots will be saved to `tests/screenshots/` and can be copied to `docs/screenshots/` for documentation use.
