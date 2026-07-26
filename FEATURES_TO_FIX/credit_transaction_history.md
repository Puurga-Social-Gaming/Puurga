# Credit System - Transaction History UI

## Status: Completed
## Priority: Medium

## Current State
- `GET /api/credits/transactions` with pagination and type/source filters
- Profile page shows filterable transaction history
- Refreshes on WebSocket `credit_update`

## Acceptance Criteria
- [x] Users can view their complete credit transaction history
- [x] Transactions are filterable (type / source)
- [x] Transaction details are clear
- [x] Data loads with pagination
- [x] Real-time refresh on new transactions
