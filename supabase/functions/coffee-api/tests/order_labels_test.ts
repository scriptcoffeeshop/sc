import { assertEquals } from "@std/assert";
import {
  getEmailDeliveryMethodLabel,
  getEmailPaymentMethodLabel,
  getFlexDeliveryMethodLabel,
  getFlexPaymentMethodLabel,
  getOrderPaymentStatusLabel,
} from "../utils/order-labels.ts";

Deno.test("Order labels - email and Flex contexts keep intentional wording", () => {
  assertEquals(
    getEmailDeliveryMethodLabel("seven_eleven"),
    "7-11 取貨/取貨付款",
  );
  assertEquals(getFlexDeliveryMethodLabel("seven_eleven"), "7-11");
  assertEquals(getEmailPaymentMethodLabel("transfer"), "銀行轉帳");
  assertEquals(getFlexPaymentMethodLabel("transfer"), "轉帳");
});

Deno.test("Order labels - unknown values remain inspectable", () => {
  assertEquals(getEmailDeliveryMethodLabel("custom_delivery"), "一般配送");
  assertEquals(
    getEmailDeliveryMethodLabel("custom_delivery", "custom_delivery"),
    "custom_delivery",
  );
  assertEquals(getEmailPaymentMethodLabel("custom_pay"), "custom_pay");
  assertEquals(
    getFlexDeliveryMethodLabel("custom_delivery"),
    "custom_delivery",
  );
  assertEquals(getOrderPaymentStatusLabel("custom_status"), "custom_status");
});
