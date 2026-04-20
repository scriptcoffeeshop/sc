# Frontend Vue Migration Plan

Last updated: 2026-04-20

## Decision

Vue 3 + Vite SFC is the final frontend target.

Starting on 2026-04-19:

- `dashboard.html`, `main.html`, `js/dashboard-app.js`, `js/main-app.js`, `js/cart.js`, and similar legacy entrypoints enter maintenance-only mode.
- No new product feature should be implemented in legacy first.
- Any unavoidable legacy change must be either:
  - a parity adapter for an already-built Vue feature
  - a P0/P1 production fix
  - a short-term deployment or compatibility fix

This decision removes the current "dual-write" pattern as the default way of shipping.

## Why This Plan Exists

The current frontend has two parallel systems:

- Legacy: native HTML + JS entrypoints
- Modern: Vue 3 + Vite SFC pages

This creates three concrete problems:

1. Every meaningful feature risks being implemented twice.
2. Payment, order, and admin flows can drift out of sync.
3. `frontend/src/pages/DashboardPage.vue` has grown to 2,345 lines and is beyond a healthy single-component size.

The current Vue dashboard is also not yet truly independent. It still boots through `initDashboardApp()` and receives data through `data-vue-managed="true"` containers plus `coffee:dashboard-*` custom events. That means the Vue page is currently a Vue shell over legacy orchestration, not the final architecture.

## Current Progress Snapshot

As of 2026-04-20:

- Vue-owned dashboard sections completed:
  - orders
  - products
  - categories
- Bridge-backed sections still pending:
  - promotions
  - form fields
  - users
  - blacklist
  - settings / session
- New regression policy in place:
  - each retired `coffee:dashboard-*` bridge must get a smoke test that still passes when the legacy custom event is blocked

## Target Architecture

### End State

- Vue owns dashboard rendering, state, tab switching, and user interactions.
- Legacy dashboard code is removed from the daily product path.
- Shared business logic lives in reusable modules or composables, not DOM-driven page scripts.
- Admin UI sections are split into focused Vue components and feature folders.

### Transitional Rule

During migration, one feature at a time becomes Vue-owned.

For a feature to be considered migrated:

- Vue renders the section
- Vue owns its local state and user interactions
- Actions call shared services/composables directly
- The section no longer depends on:
  - `data-vue-managed="true"`
  - legacy DOM mutation to render content
  - `coffee:dashboard-*` bridge events

## Legacy Sunset Policy

### Effective Date

2026-04-19

### Allowed Legacy Changes After 2026-04-19

- Production bug fixes
- Security fixes
- Payment/regression hotfixes
- Temporary compatibility glue while a feature is actively being migrated

### Disallowed Legacy Changes After 2026-04-19

- New product capability implemented only in legacy
- New dashboard UI added only to `dashboard.html`
- New admin workflow introduced through DOM-driven rendering instead of Vue

### Sunset Milestones

#### 2026-04-19 to 2026-04-26

- Freeze new feature work in legacy admin.
- All new dashboard work must land in Vue-first form.
- Create Vue decomposition scaffolding and migration checklist.

#### 2026-04-27 to 2026-05-10

- Split `DashboardPage.vue` into section components without changing product behavior.
- Keep bridge layer temporarily, but stop growing the monolith.

#### 2026-05-11 to 2026-05-31

- Migrate high-change sections to Vue-owned state and actions:
  - orders
  - products
  - categories
  - promotions
  - form fields
- Status on 2026-04-20:
  - orders: done
  - products: done
  - categories: done
  - promotions: pending
  - form fields: pending

#### 2026-06-01 to 2026-06-14

- Migrate settings, icon library, users, blacklist, and session/login flow.
- Remove dependency on dashboard-specific legacy page orchestration for normal admin usage.

#### 2026-06-15 to 2026-06-21

- Parity soak period:
  - E2E coverage
  - UAT on payments, order status, settings, and user management
  - fix-only window

#### 2026-06-22

- Legacy dashboard enters removal-ready state.
- `dashboard.html` and `js/dashboard-app.js` should either:
  - redirect to the Vue entrypoint, or
  - be deleted if no longer needed by deployment/runtime constraints

## Scope Priority

### Wave 1: Dashboard

Dashboard is the first migration target because:

- it already has a Vue page
- it carries the highest admin change frequency
- it currently duplicates the most behavior

### Wave 2: Storefront

After dashboard stabilizes, apply the same policy to:

- `frontend/src/pages/MainPage.vue`
- `main.html`
- `js/main-app.js`
- `js/cart.js`

The dashboard migration should establish the repeatable pattern for storefront migration.

## Dashboard Decomposition Blueprint

Create a feature-oriented structure under `frontend/src/features/dashboard/`.

### Shell

- `frontend/src/features/dashboard/DashboardShell.vue`
- `frontend/src/features/dashboard/DashboardHeader.vue`
- `frontend/src/features/dashboard/DashboardTabs.vue`
- `frontend/src/features/dashboard/useDashboardBoot.js`

### Orders

- `frontend/src/features/dashboard/orders/OrdersSection.vue`
- `frontend/src/features/dashboard/orders/OrdersFilters.vue`
- `frontend/src/features/dashboard/orders/OrdersBulkActions.vue`
- `frontend/src/features/dashboard/orders/OrdersSummary.vue`
- `frontend/src/features/dashboard/orders/OrderCardList.vue`
- `frontend/src/features/dashboard/orders/OrderCard.vue`
- `frontend/src/features/dashboard/orders/useOrdersSection.js`

### Products

- `frontend/src/features/dashboard/products/ProductsSection.vue`
- `frontend/src/features/dashboard/products/ProductsTable.vue`
- `frontend/src/features/dashboard/products/ProductRow.vue`
- `frontend/src/features/dashboard/products/ProductModal.vue`
- `frontend/src/features/dashboard/products/useProductsSection.js`

### Categories

- `frontend/src/features/dashboard/categories/CategoriesSection.vue`
- `frontend/src/features/dashboard/categories/CategoryList.vue`
- `frontend/src/features/dashboard/categories/CategoryRow.vue`

### Promotions

- `frontend/src/features/dashboard/promotions/PromotionsSection.vue`
- `frontend/src/features/dashboard/promotions/PromotionsTable.vue`
- `frontend/src/features/dashboard/promotions/PromotionRow.vue`
- `frontend/src/features/dashboard/promotions/PromotionModal.vue`

### Users and Blacklist

- `frontend/src/features/dashboard/users/UsersSection.vue`
- `frontend/src/features/dashboard/users/UsersTable.vue`
- `frontend/src/features/dashboard/users/BlacklistSection.vue`

### Settings

- `frontend/src/features/dashboard/settings/SettingsSection.vue`
- `frontend/src/features/dashboard/settings/BrandingSettingsCard.vue`
- `frontend/src/features/dashboard/settings/SectionTitleSettingsCard.vue`
- `frontend/src/features/dashboard/settings/AnnouncementSettingsCard.vue`
- `frontend/src/features/dashboard/settings/OrderNotificationSettingsCard.vue`
- `frontend/src/features/dashboard/settings/StoreStatusSettingsCard.vue`
- `frontend/src/features/dashboard/settings/DeliveryRoutingSettingsCard.vue`
- `frontend/src/features/dashboard/settings/PaymentOptionsSettingsCard.vue`
- `frontend/src/features/dashboard/settings/BankAccountsSettingsCard.vue`
- `frontend/src/features/dashboard/settings/useSettingsSection.js`

### Icon Library

- `frontend/src/features/dashboard/icons/IconLibrarySection.vue`
- `frontend/src/features/dashboard/icons/IconLibraryFilters.vue`
- `frontend/src/features/dashboard/icons/IconLibraryGrid.vue`

### Form Fields

- `frontend/src/features/dashboard/form-fields/FormFieldsSection.vue`
- `frontend/src/features/dashboard/form-fields/FormFieldList.vue`
- `frontend/src/features/dashboard/form-fields/FormFieldRow.vue`
- `frontend/src/features/dashboard/form-fields/FormFieldModal.vue`

## Recommended Split Order for `DashboardPage.vue`

Do not rewrite the whole file in one pass. Split in this order:

1. Shell and tabs
2. Orders section
3. Product modal and products section
4. Categories section
5. Promotions section and modal
6. Users and blacklist sections
7. Settings section
8. Icon library section
9. Form fields section

This order follows both file weight and operational risk.

## Migration Execution Rules

### Rule 1

No new dashboard feature ships unless the Vue path is the source of truth.

### Rule 2

For each migrated section, add or update:

- one focused E2E scenario
- one smoke assertion for the main happy path
- one parity checklist item proving the legacy bridge can be retired

### Rule 3

Do not move DOM-heavy code from one giant file into one giant composable.
Component split must also split responsibilities.

### Rule 4

Bridge code must only shrink from this point forward.

That means:

- fewer `window.*` globals
- fewer `data-vue-managed` islands
- fewer custom bridge events
- less dashboard logic in `js/dashboard-app.js`

## Definition of Done

Dashboard migration is complete when all of the following are true:

- `DashboardPage.vue` is reduced to a shell-level page component
- each tab is implemented as a dedicated Vue section component
- dashboard no longer depends on legacy DOM rendering for section content
- dashboard no longer needs `coffee:dashboard-*` custom events for core data flow
- legacy admin page is removed, redirected, or no longer part of normal product operation

## Success Metrics

- `frontend/src/pages/DashboardPage.vue` under 400 lines
- `js/dashboard-app.js` under 250 lines or removed entirely
- zero new feature commits touching both Vue and legacy admin UI
- all critical admin flows covered by E2E:
  - order status update
  - refund / payment confirmation
  - settings save
  - product edit
  - user blacklist / role update

## Immediate Next Actions

1. Create the `frontend/src/features/dashboard/` directory structure.
2. Keep `DashboardPage.vue` as shell-only wiring and avoid new section logic there.
3. Replace the promotions custom-event bridge with Vue-owned state/actions.
4. Repeat section by section until `DashboardPage.vue` becomes composition-only.
