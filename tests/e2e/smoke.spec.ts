import { expect, test, type Page, type Route } from '@playwright/test';

const API_URL = 'https://avnvsjyyeofivgmrchte.supabase.co/functions/v1/coffee-api';
const SUPABASE_REST_PREFIX = 'https://avnvsjyyeofivgmrchte.supabase.co/rest/v1/';

function jsonHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': '*',
    'content-type': 'application/json',
  };
}

async function fulfillJson(route: Route, payload: unknown, status = 200) {
  await route.fulfill({
    status,
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
}

async function installGlobalStubs(page: Page) {
  // 攔截 SweetAlert2 CDN，避免真實腳本覆蓋 mock
  await page.route('**/sweetalert2**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* swal blocked */' }),
  );

  await page.addInitScript(() => {
    const noop = () => { };
    (window as any).Swal = {
      fire: async () => ({ isConfirmed: true }),
      close: noop,
      showLoading: noop,
      mixin: () => ({ fire: async () => ({}) }),
    };
  });
}

type MainRouteOptions = {
  payment?: {
    cod: boolean;
    linepay: boolean;
    transfer: boolean;
  };
};

async function installMainRoutes(page: Page, options: MainRouteOptions = {}) {
  const payment = options.payment ?? { cod: true, linepay: false, transfer: true };
  await page.route(`${SUPABASE_REST_PREFIX}**`, async (route) => {
    // Force storefront fallback path (getInitData) for deterministic smoke checks.
    await route.abort();
  });

  await page.route(`${API_URL}**`, async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await fulfillJson(route, {});
      return;
    }

    const url = new URL(request.url());
    const action = url.searchParams.get('action');

    if (action === 'getInitData') {
      await fulfillJson(route, {
        success: true,
        products: [
          {
            id: 101,
            category: '測試分類',
            name: '測試豆',
            description: 'E2E smoke',
            price: 220,
            roastLevel: '中焙',
            specs: JSON.stringify([
              { key: 'quarter', label: '1/4磅', price: 220, enabled: true },
            ]),
            enabled: true,
          },
        ],
        categories: [{ id: 1, name: '測試分類' }],
        formFields: [],
        bankAccounts: [
          { id: 'ba-1', bankCode: '013', bankName: '國泰世華', accountNumber: '111122223333', accountName: 'A戶' },
          { id: 'ba-2', bankCode: '011', bankName: '台北富邦', accountNumber: '444455556666', accountName: 'B戶' },
        ],
        promotions: [],
        settings: {
          is_open: 'true',
          delivery_options_config: JSON.stringify([
            {
              id: 'delivery',
              icon: '🛵',
              name: '配送到府',
              description: '新竹配送',
              enabled: true,
              payment,
            },
          ]),
          payment_options_config: JSON.stringify({
            cod: { icon: '💵', name: '貨到付款', description: '到付' },
            linepay: { icon: '💚', name: 'LINE Pay', description: '線上安全付款' },
            transfer: { icon: '🏦', name: '線上轉帳', description: 'ATM / 網銀' },
          }),
        },
      });
      return;
    }

    await fulfillJson(route, { success: true });
  });
}

async function installDashboardRoutes(page: Page) {
  await page.route(`${API_URL}**`, async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await fulfillJson(route, {});
      return;
    }

    const url = new URL(request.url());
    const action = url.searchParams.get('action');

    if (action === 'getCategories') {
      await fulfillJson(route, { success: true, categories: [{ id: 1, name: '測試分類' }] });
      return;
    }

    if (action === 'getProducts') {
      await fulfillJson(route, {
        success: true,
        products: [
          {
            id: 201,
            category: '測試分類',
            name: '後台測試商品',
            description: 'admin smoke',
            price: 180,
            roastLevel: '中焙',
            specs: JSON.stringify([{ key: 'single', label: '單包', price: 180, enabled: true }]),
            enabled: true,
          },
        ],
      });
      return;
    }

    if (action === 'getOrders') {
      await fulfillJson(route, {
        success: true,
        orders: [
          {
            orderId: 'ORD001',
            timestamp: '2026-03-02T00:00:00.000Z',
            deliveryMethod: 'in_store',
            status: 'pending',
            lineName: '測試客戶',
            phone: '0900000000',
            email: '',
            items: '後台測試商品 x1',
            total: 180,
            paymentMethod: 'cod',
            paymentStatus: '',
          },
        ],
      });
      return;
    }

    await fulfillJson(route, { success: true });
  });
}

test.describe('smoke', () => {
  test('storefront path works with event delegation', async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page);

    await page.goto('/main.html');

    await expect(page.locator('#products-container')).toContainText('測試豆');
    await page.locator('[data-action="select-delivery"][data-method="delivery"]').click();
    await expect(page.locator('#delivery-address-section')).toBeVisible();

    await page.selectOption('#delivery-city', '新竹市');
    await expect(page.locator('#delivery-district option')).toHaveCount(4);

    await page.locator('[data-action="select-payment"][data-method="transfer"]').click();
    await expect(page.locator('#transfer-info-section')).toBeVisible();

    const accountCards = page.locator('#bank-accounts-list [data-action="select-bank-account"]');
    const accountRadios = page.locator('#bank-accounts-list input[name="bank_account_selection"]');
    await expect(accountCards).toHaveCount(2);
    await expect(accountRadios).toHaveCount(2);
    await expect(accountCards.nth(0)).toHaveClass(/ring-2/);
    await expect(accountRadios.nth(0)).toBeChecked();

    // 直接點 radio 應同步切換藍框與選取狀態
    await accountRadios.nth(1).click();
    await expect(accountCards.nth(1)).toHaveClass(/ring-2/);
    await expect(accountCards.nth(0)).not.toHaveClass(/ring-2/);
    await expect(accountRadios.nth(1)).toBeChecked();

    // 複製按鈕不可改變目前選取
    await page.locator('#bank-accounts-list [data-action="copy-transfer-account"]').nth(1).click();
    await expect(accountCards.nth(1)).toHaveClass(/ring-2/);
    await expect(accountRadios.nth(1)).toBeChecked();

    // 切換付款方式再切回轉帳，帳號選取需保留（避免藍框/選取狀態回歸）
    await page.locator('[data-action="select-payment"][data-method="cod"]').click();
    await expect(page.locator('#transfer-info-section')).toBeHidden();
    await page.locator('[data-action="select-payment"][data-method="transfer"]').click();
    await expect(page.locator('#transfer-info-section')).toBeVisible();
    await expect(accountCards.nth(1)).toHaveClass(/ring-2/);
    await expect(accountRadios.nth(1)).toBeChecked();
  });

  test('storefront submit order happy path works', async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page);

    let submitOrderCalls = 0;
    let submitBody: any = null;
    await page.route(`${API_URL}?action=submitOrder**`, async (route) => {
      submitOrderCalls += 1;
      submitBody = route.request().postDataJSON();
      await fulfillJson(route, {
        success: true,
        orderId: 'SO001',
        total: 220,
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem(
        'coffee_user',
        JSON.stringify({ userId: 'user-1', displayName: '測試客戶', pictureUrl: '' }),
      );
      localStorage.setItem('coffee_jwt', 'mock-token');
    });

    await page.goto('/main.html');

    await expect(page.locator('#products-container')).toContainText('測試豆');

    await page.locator('[data-action="select-delivery"][data-method="delivery"]').click();
    await page.selectOption('#delivery-city', '新竹市');
    await page.fill('#delivery-detail-address', '測試路 1 號');

    await page.locator('[data-action="add-to-cart"]').first().click();
    await page.check('#policy-agree');
    await page.locator('.bottom-bar [data-action="toggle-cart"]').click();
    await expect(page.locator('#cart-drawer')).toBeVisible();

    await page.locator('#cart-submit-btn').click();

    await expect.poll(() => submitOrderCalls).toBe(1);
    expect(submitBody).toBeTruthy();
    expect(submitBody.deliveryMethod).toBe('delivery');
    expect(submitBody.city).toBe('新竹市');
    expect(submitBody.address).toBe('測試路 1 號');
    expect(Array.isArray(submitBody.items)).toBeTruthy();
    expect(submitBody.items.length).toBeGreaterThan(0);

    await expect(page.locator('#cart-items')).toContainText('購物車是空的');
  });

  test('storefront submit order transfer path works', async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page, {
      payment: { cod: true, linepay: false, transfer: true },
    });

    let submitOrderCalls = 0;
    let submitBody: any = null;
    await page.route(`${API_URL}?action=submitOrder**`, async (route) => {
      submitOrderCalls += 1;
      submitBody = route.request().postDataJSON();
      await fulfillJson(route, {
        success: true,
        orderId: 'SO-TRANSFER-1',
        total: 220,
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem(
        'coffee_user',
        JSON.stringify({ userId: 'user-1', displayName: '測試客戶', pictureUrl: '' }),
      );
      localStorage.setItem('coffee_jwt', 'mock-token');
    });

    await page.goto('/main.html');

    await page.locator('[data-action="select-delivery"][data-method="delivery"]').click();
    await page.selectOption('#delivery-city', '新竹市');
    await page.fill('#delivery-detail-address', '測試路 2 號');

    await page.locator('[data-action="add-to-cart"]').first().click();
    await page.locator('[data-action="select-payment"][data-method="transfer"]').click();
    await expect(page.locator('#transfer-info-section')).toBeVisible();
    await page.locator('#bank-accounts-list input[name="bank_account_selection"]').nth(1).click();
    await page.fill('#transfer-last5', '12345');
    await page.check('#policy-agree');

    await page.locator('.bottom-bar [data-action="toggle-cart"]').click();
    await page.locator('#cart-submit-btn').click();

    await expect.poll(() => submitOrderCalls).toBe(1);
    expect(submitBody).toBeTruthy();
    expect(submitBody.paymentMethod).toBe('transfer');
    expect(submitBody.transferAccountLast5).toBe('12345');
    expect(String(submitBody.transferTargetAccount || '')).toContain('444455556666');
    await expect(page.locator('#cart-items')).toContainText('購物車是空的');
  });

  test('storefront submit order linepay redirect path works', async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page, {
      payment: { cod: true, linepay: true, transfer: false },
    });

    let submitOrderCalls = 0;
    let submitBody: any = null;
    await page.route(`${API_URL}?action=submitOrder**`, async (route) => {
      submitOrderCalls += 1;
      submitBody = route.request().postDataJSON();
      await fulfillJson(route, {
        success: true,
        orderId: 'SO-LINEPAY-1',
        total: 220,
        paymentUrl: '/main.html?linepay_redirect=1',
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem(
        'coffee_user',
        JSON.stringify({ userId: 'user-1', displayName: '測試客戶', pictureUrl: '' }),
      );
      localStorage.setItem('coffee_jwt', 'mock-token');
    });

    await page.goto('/main.html');

    await page.locator('[data-action="select-delivery"][data-method="delivery"]').click();
    await page.selectOption('#delivery-city', '新竹市');
    await page.fill('#delivery-detail-address', '測試路 3 號');
    await page.locator('[data-action="add-to-cart"]').first().click();

    await page.locator('[data-action="select-payment"][data-method="linepay"]').click();
    await expect(page.locator('#transfer-info-section')).toBeHidden();
    await page.check('#policy-agree');

    await page.locator('.bottom-bar [data-action="toggle-cart"]').click();
    await page.locator('#cart-submit-btn').click();

    await expect.poll(() => submitOrderCalls).toBe(1);
    expect(submitBody).toBeTruthy();
    expect(submitBody.paymentMethod).toBe('linepay');
    await expect(page).toHaveURL(/linepay_redirect=1/);
  });

  test('dashboard path works with event delegation', async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page);

    let updateStatusCalls = 0;
    await page.route(`${API_URL}?action=updateOrderStatus**`, async (route) => {
      updateStatusCalls += 1;
      await fulfillJson(route, { success: true });
    });

    await page.addInitScript(() => {
      localStorage.setItem(
        'coffee_admin',
        JSON.stringify({ userId: 'admin-1', displayName: '測試管理員', role: 'SUPER_ADMIN' }),
      );
      localStorage.setItem('coffee_jwt', 'mock-token');
    });

    await page.goto('/dashboard.html');

    await expect(page.locator('#admin-page')).toBeVisible();
    await expect(page.locator('#orders-list')).toContainText('#ORD001');

    const statusSelect = page.locator('select[data-action="change-order-status"][data-order-id="ORD001"]');
    await statusSelect.selectOption('processing');
    await expect.poll(() => updateStatusCalls).toBeGreaterThan(0);

    await page.locator('#tab-products').click();
    await page.locator('button[data-action="edit-product"]').first().click();
    await expect(page.locator('#product-modal')).toBeVisible();
    await expect(page.locator('#pm-title')).toHaveText('編輯商品');
  });
});
