# Changelog

All notable changes to this project will be documented in this file.

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
