# Frontend Vue Migration Plan

Last updated: 2026-04-25

## Decision

Vue 3 + Vite SFC is the final frontend target.

Starting on 2026-04-19:

- Root `dashboard.html` / `main.html` are local compatibility redirects; tracked `js/` compatibility wrappers are removed.
- No new product feature should be implemented in legacy or DOM fallback code first.
- Any unavoidable compatibility change must be either:
  - a parity adapter for an already-built Vue feature
  - a P0/P1 production fix
  - a short-term deployment or compatibility fix

This decision removes the current "dual-write" pattern as the default way of shipping.

## Why This Plan Exists

The frontend historically had two parallel systems:

- Legacy: native HTML + JS entrypoints
- Modern: Vue 3 + Vite SFC pages

The remaining risk is now smaller but still real: compatibility redirects and DOM fallback helpers can still create drift if they grow again. This creates three concrete problems:

1. Every meaningful feature risks being implemented twice.
2. Payment, order, and admin flows can drift out of sync.
3. Remaining large dashboard sections can still become difficult to review if they are allowed to grow back into monoliths.

The current Vue dashboard is much thinner than before. The `coffee:dashboard-*` bridges, section-level DOM renderers, and `initDashboardApp()` fallback are already gone. The remaining boot/service wiring now lives in `frontend/src/features/dashboard/bootstrapDashboard.ts`, tracked `js/` compatibility wrappers are gone, and order notification/status orchestration now lives in `frontend/src/features/dashboard/dashboardOrder*.ts`.

Storefront legacy rendering is also moving into removal mode: the remaining `innerHTML` renderers in tracked legacy `js/*.js` have been removed, and smoke coverage now blocks regression on the core storefront containers.

## Current Progress Snapshot

As of 2026-04-25:

- Vue-owned dashboard sections completed:
  - orders
  - products
  - categories
  - promotions
  - form fields
  - users
  - blacklist
  - session / login flow
  - settings
  - settings icon controls / icon library quick apply
- Recent decomposition:
  - `DashboardPage.vue`: 167 lines
  - `DashboardSettingsSection.vue`: 39 lines
  - `DashboardOrdersSection.vue`: 31 lines
  - `MainPage.vue`: 472 lines
  - `dashboardOrderFlexMessage.ts`: 40 lines
  - `dashboardOrderStatusController.ts`: 249 lines
  - settings cards: branding, section titles, storefront status, delivery/payment routing, payment options, bank accounts
  - orders subcomponents: toolbar, order card
  - notification modules: flex payload builder shell + body/bubble/layout helpers, flex controller, email controller
  - storefront subcomponents: header, product grid, delivery section, payment section, bottom bar, cart drawer, order history modal
- Remaining legacy-heavy areas:
  - local compatibility redirects for root `dashboard.html` / `main.html`
  - storefront DOM fallback helpers that still coordinate payment/store-search/order-history side effects from `frontend/src/features/storefront/`
  - `data-vue-managed` compatibility guards that can be removed once the remaining fallback helpers are retired
- New regression policy in place:
  - each retired `coffee:dashboard-*` bridge must get a smoke test that still passes when the legacy custom event is blocked
  - Vue/TS runtime files must not add inline event attributes or `data-action`

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

- Freeze new feature work in legacy admin and DOM fallback helpers.
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
  - promotions: done
  - form fields: done
  - users: done
  - blacklist: done

#### 2026-06-01 to 2026-06-14

- Migrate settings, icon library, users, blacklist, and session/login flow.
- Status on 2026-04-20:
  - settings: done early
  - icon library: Vue shell + reactive quick apply wiring done
  - settings local actions: done early
  - form fields local actions: done early
  - orders local actions: done early
  - categories local actions: done early
  - products local actions + modal submit: done early
  - promotions local actions + modal submit: done early
  - users: done early
  - blacklist: done early
  - session/login flow: done early
  - settings bank accounts: done early
- Remove dependency on dashboard-specific legacy page orchestration for normal admin usage.

#### 2026-06-15 to 2026-06-21

- Parity soak period:
  - E2E coverage
  - UAT on payments, order status, settings, and user management
  - fix-only window

#### 2026-06-22

- Legacy dashboard enters removal-ready state.
- Root `dashboard.html` redirects to the Vue build output; tracked `js/` compatibility wrappers are deleted and blocked from returning.

## Scope Priority

### Wave 1: Dashboard

Dashboard is the first migration target because:

- it already has a Vue page
- it carries the highest admin change frequency
- it currently duplicates the most behavior

### Wave 2: Storefront

After dashboard stabilizes, apply the same policy to:

- `frontend/src/pages/MainPage.vue`
- root `main.html` compatibility redirect
- remaining storefront DOM fallback helpers under `frontend/src/features/storefront/`

The dashboard migration should establish the repeatable pattern for storefront migration.

Initial storefront progress:

- login / profile / my orders / logout entry controls already moved to Vue component event handlers
- body-level click delegation is no longer required for those member-entry controls
- payment selection, announcement close, my orders modal close, and transfer bank-account interactions no longer require body-level click delegation either
- delivery option selection, store-search result selection, tracking-number copy, and load-failure retry no longer require body-level click delegation
- storefront body-level click delegation has been removed from the normal runtime path
- delivery options and transfer bank-account lists are now rendered by `MainPage.vue`; fallback renderers skip Vue-managed containers and should be deleted after their state side effects are extracted
- my-orders list rendering no longer uses `innerHTML` for API order payloads; Vue `StorefrontOrderHistoryCard.vue` is the active renderer

## Dashboard Decomposition Blueprint

Create a feature-oriented structure under `frontend/src/features/dashboard/`.

### Shell

- `frontend/src/features/dashboard/DashboardShell.vue`
- `frontend/src/features/dashboard/DashboardHeader.vue`
- `frontend/src/features/dashboard/DashboardTabs.vue`
- `frontend/src/features/dashboard/useDashboardBoot.ts`

### Orders

- `frontend/src/features/dashboard/DashboardOrdersSection.vue`
- `frontend/src/features/dashboard/DashboardOrdersToolbar.vue`
- `frontend/src/features/dashboard/DashboardOrderCard.vue`
- `frontend/src/features/dashboard/useDashboardOrders.ts`

### Products

- `frontend/src/features/dashboard/products/ProductsSection.vue`
- `frontend/src/features/dashboard/products/ProductsTable.vue`
- `frontend/src/features/dashboard/products/ProductRow.vue`
- `frontend/src/features/dashboard/products/ProductModal.vue`
- `frontend/src/features/dashboard/products/useProductsSection.ts`

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

- `frontend/src/features/dashboard/DashboardSettingsSection.vue`
- `frontend/src/features/dashboard/DashboardBrandingSettingsCard.vue`
- `frontend/src/features/dashboard/DashboardSectionTitlesSettingsCard.vue`
- `frontend/src/features/dashboard/DashboardStorefrontStatusSettingsCard.vue`
- `frontend/src/features/dashboard/DashboardDeliveryPaymentSettingsCard.vue`
- `frontend/src/features/dashboard/DashboardPaymentOptionsSettingsCard.vue`
- `frontend/src/features/dashboard/DashboardBankAccountsSettingsCard.vue`
- `frontend/src/features/dashboard/useDashboardSettings.ts`

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
- no tracked `js/` compatibility wrapper reintroduced

## Definition of Done

Dashboard migration is complete when all of the following are true:

- `DashboardPage.vue` is reduced to a shell-level page component
- each tab is implemented as a dedicated Vue section component
- dashboard no longer depends on legacy DOM rendering for section content
- dashboard no longer needs `coffee:dashboard-*` custom events for core data flow
- legacy admin page is removed, redirected, or no longer part of normal product operation

## Success Metrics

- `frontend/src/pages/DashboardPage.vue` under 400 lines
- no tracked root `js/` compatibility wrappers
- zero new feature commits touching both Vue and legacy admin UI
- all critical admin flows covered by E2E:
  - order status update
  - refund / payment confirmation
  - settings save
  - product edit
  - user blacklist / role update

## Immediate Next Actions

1. Delete storefront fallback renderers that only exist to support removed legacy pages.
2. Move remaining storefront side effects behind typed state/actions instead of DOM helpers.
3. Remove `data-vue-managed` guards after the corresponding fallback path is gone.
4. Keep `DashboardPage.vue` / `MainPage.vue` as shell-level composition and avoid new imperative section logic.
