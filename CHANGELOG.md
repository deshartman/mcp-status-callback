# Changelog

All notable changes to this project will be documented in this file.

## [0.5.1] - 2025-09-04

### Added
- Exported `CallbackHandlerEventNames` constants (`LOG`, `CALLBACK`, `TUNNEL_STATUS`) for type-safe event handling.
- Added comprehensive JSDoc comments to `CallbackHandler`, interfaces, and methods for improved discoverability and documentation.

### Changed
- Updated internal `emit` calls to use `CallbackHandlerEventNames` constants for consistency.
- Updated README examples and API reference to use `CallbackHandlerEventNames`.

## [0.5.0] - 2025-04-07

### Changed
- Migrated from community-maintained ngrok package to the official @ngrok/ngrok JavaScript SDK
- Updated the implementation to use the new SDK's API
- Improved error handling and tunnel status monitoring
- Updated dependencies and peer dependencies

### Added
- Updated tests to work with the new @ngrok/ngrok SDK
- Added both JavaScript and TypeScript test examples
- Enhanced test documentation in test/README.md
- Tests now demonstrate the new start() method that returns the public URL directly

## [0.4.4] - 2025-04-03

### Changed
- Updated Node.js requirement from >=16.0.0 to >=18.0.0 to ensure compatibility with the MCP SDK and newer Express versions
- Updated @types/node from 16 to 18
- This fixes the "TypeError: Object.hasOwn is not a function" error when using with Node.js v16.0.0

## [0.4.3] - 2025-04-03

### Changed
- Downgraded Express from v5 to v4 (^4.18.2) for improved stability and compatibility and avoid the "TypeError: Object.hasOwn is not a function" error when loading.

## [0.4.2] - 2025-04-02

### Changed
- The request body received is now parsed from application/x-www-form-urlencoded to JSON to keep it consistent with other responses.


## [0.4.1] - 2025-04-02

### Fixed
- Fixed tunnel shutdown with ngrok.disconnect(). Was leaving tunnels open when using NPM.

## [0.4.0] - 2025-03-29

### Changed
- Updated the `CallbackEventData` type to include `queryParameters` and `body` properties instead of a single `message` property
- This provides more detailed access to both query parameters and the request body in callback events
- Updated documentation and examples to reflect the new structure

## [0.3.1] - 2025-03-28

### Changed
- Updated the CallbackHandler constructor to take an options object with required `ngrokAuthToken` and optional `customDomain` parameters
- Removed parameters from the `start()` method as they're now provided in the constructor
- Exported the `CallbackHandlerOptions` interface for better TypeScript support
- Updated all examples and tests to use the new constructor format
- Updated documentation to reflect the new API

### Fixed
- Improved error handling when Ngrok auth token is not provided
