# Stripe Fulfilment Agent

## Purpose
React to payment events and handle subscription fulfillment, upgrades, and billing state changes.

## Inputs
- Stripe webhook events
- Payment status changes
- Subscription modifications

## Outputs
- Fulfillment status updates
- User access level changes
- Billing notifications

## External Data Access
✅ **Required** - This agent requires external permissions

## Permissions Required
- **Stripe API Access**:
  - Read payment events
  - Read subscription data
  - Write fulfillment status
- **Database Access**:
  - Update user subscription status
  - Log payment events
  - Trigger downstream actions

## Agent Type
External-access agent - **APPEARS** in external agent management UI

## Security Considerations
- Money + state changes = high risk
- All payment events must be logged immutably
- Failed payments require immediate notification
- Subscription changes affect user access levels

## Execution Context
- Triggered by Stripe webhooks
- Processes payment events in real-time
- Updates user access and billing status