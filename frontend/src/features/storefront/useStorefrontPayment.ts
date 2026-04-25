import { computed, ref } from "vue";
import type { SweetAlertIcon, SweetAlertOptions } from "sweetalert2";
import { getIconUrlFromConfig } from "../../lib/icons.ts";
import { parseJsonRecord } from "../../lib/jsonUtils.ts";
import type {
  StorefrontPaymentAvailability,
  StorefrontPaymentMethod,
} from "./storefrontRuntime";

export type { StorefrontPaymentAvailability };

export interface StorefrontBankAccount {
  id?: string | number;
  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
}

interface StorefrontPaymentSnapshot {
  bankAccounts?: StorefrontBankAccount[];
  selectedBankAccountId?: string | number;
  selectedPayment?: string;
  availablePaymentMethods?: Partial<StorefrontPaymentAvailability>;
  settings?: {
    payment_options_config?: unknown;
  };
}

interface StorefrontPaymentDeps {
  getStorefrontUiSnapshot?: () => StorefrontPaymentSnapshot;
  selectPayment?: (method: string) => unknown;
  selectBankAccount?: (bankId: string | number) => unknown;
  clipboard?: {
    writeText?: (text: string) => Promise<unknown>;
  };
  Toast?: {
    fire?: (payload: SweetAlertOptions) => unknown;
  };
  Swal?: {
    fire?: {
      (options: SweetAlertOptions): unknown;
      (title?: string, html?: string, icon?: SweetAlertIcon): unknown;
    };
  };
  setTimeout?: (callback: () => void, delay: number) => unknown;
}

export interface StorefrontPaymentOptionView {
  method: StorefrontPaymentMethod;
  name: string;
  description: string;
  iconUrl: string;
  nameClass: string;
}

const PAYMENT_METHODS: StorefrontPaymentMethod[] = [
  "cod",
  "linepay",
  "jkopay",
  "transfer",
];

const DEFAULT_PAYMENT_OPTIONS: Record<
  StorefrontPaymentMethod,
  { name: string; description: string; nameClass: string }
> = {
  cod: {
    name: "取件 / 到付",
    description: "取貨時付現或宅配到付",
    nameClass: "",
  },
  linepay: {
    name: "LINE Pay",
    description: "線上安全付款",
    nameClass: "text-[#06C755]",
  },
  jkopay: {
    name: "街口支付",
    description: "街口支付線上付款",
    nameClass: "text-orange-600",
  },
  transfer: {
    name: "線上轉帳",
    description: "ATM / 網銀匯款",
    nameClass: "text-blue-600",
  },
};

function normalizePaymentAvailability(
  value: Partial<StorefrontPaymentAvailability> | undefined,
): StorefrontPaymentAvailability {
  return {
    cod: Boolean(value?.cod),
    linepay: Boolean(value?.linepay),
    jkopay: Boolean(value?.jkopay),
    transfer: Boolean(value?.transfer),
  };
}

export function useStorefrontPayment(deps: StorefrontPaymentDeps = {}) {
  const bankAccounts = ref<StorefrontBankAccount[]>([]);
  const selectedBankAccountId = ref("");
  const copiedBankAccountId = ref("");
  const selectedPayment = ref("cod");
  const paymentAvailability = ref<StorefrontPaymentAvailability>({
    cod: true,
    linepay: false,
    jkopay: false,
    transfer: false,
  });
  const paymentOptionConfig = ref<Record<string, Record<string, unknown>>>({});

  const paymentOptions = computed<StorefrontPaymentOptionView[]>(() =>
    PAYMENT_METHODS.map((method) => {
      const defaults = DEFAULT_PAYMENT_OPTIONS[method];
      const option = paymentOptionConfig.value[method] || {};
      return {
        method,
        name: String(option["name"] || defaults.name),
        description: String(option["description"] || defaults.description),
        iconUrl: getIconUrlFromConfig(
          {
            icon_url: option["icon_url"],
            iconUrl: option["iconUrl"],
          },
          method,
        ),
        nameClass: defaults.nameClass,
      };
    })
  );

  function syncPaymentState() {
    const snapshot = deps.getStorefrontUiSnapshot?.() || {};
    bankAccounts.value = Array.isArray(snapshot.bankAccounts)
      ? snapshot.bankAccounts
      : [];
    selectedBankAccountId.value = String(snapshot.selectedBankAccountId || "");
    selectedPayment.value = String(snapshot.selectedPayment || "cod");
    paymentAvailability.value = normalizePaymentAvailability(
      snapshot.availablePaymentMethods,
    );
    paymentOptionConfig.value = parseJsonRecord(
      snapshot.settings?.payment_options_config,
    ) as Record<string, Record<string, unknown>>;
  }

  function handleSelectPayment(method: string) {
    deps.selectPayment?.(method);
    syncPaymentState();
  }

  function handleSelectBankAccount(bankId: string | number | undefined) {
    if (bankId === undefined) return;
    deps.selectBankAccount?.(bankId);
    syncPaymentState();
  }

  function handleCopyTransferAccount(
    bankId: string | number | undefined,
    accountNumber: string | undefined,
  ) {
    if (bankId === undefined) return;
    const account = String(accountNumber || "").trim();
    if (!account) return;

    const writePromise = deps.clipboard?.writeText?.(account);
    if (!writePromise) {
      deps.Swal?.fire?.("錯誤", "複製失敗，請手動複製", "error");
      return;
    }

    writePromise
      .then(() => {
        copiedBankAccountId.value = String(bankId);
        deps.Toast?.fire?.({ icon: "success", title: "帳號已複製" });
        deps.setTimeout?.(() => {
          if (copiedBankAccountId.value === String(bankId)) {
            copiedBankAccountId.value = "";
          }
        }, 2000);
      })
      .catch(() => deps.Swal?.fire?.("錯誤", "複製失敗，請手動複製", "error"));
  }

  return {
    bankAccounts,
    selectedBankAccountId,
    selectedPayment,
    paymentAvailability,
    paymentOptions,
    copiedBankAccountId,
    syncPaymentState,
    handleSelectPayment,
    handleSelectBankAccount,
    handleCopyTransferAccount,
  };
}
