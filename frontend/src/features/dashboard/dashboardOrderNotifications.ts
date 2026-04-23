import { createOrderEmailController } from "./dashboardOrderEmailController.ts";
import { createOrderFlexController } from "./dashboardOrderFlexController.ts";
import { createOrderFlexMessageBuilder } from "./dashboardOrderFlexMessage.ts";

export function createOrderNotificationsController(deps) {
  function getOrders() {
    return Array.isArray(deps.getOrders?.()) ? deps.getOrders() : [];
  }

  const flexMessageBuilder = createOrderFlexMessageBuilder(deps);
  const orderFlexController = createOrderFlexController({
    ...deps,
    getOrders,
    buildLineFlexMessage: flexMessageBuilder.buildLineFlexMessage,
    resolveOrderLineUserId: flexMessageBuilder.resolveOrderLineUserId,
  });
  const orderEmailController = createOrderEmailController({
    ...deps,
    getOrders,
  });

  return {
    previewOrderStatusNotification:
      orderFlexController.previewOrderStatusNotification,
    showFlexHistory: orderFlexController.showFlexHistory,
    sendOrderFlexByOrderId: orderFlexController.sendOrderFlexByOrderId,
    sendOrderEmailByOrderId: orderEmailController.sendOrderEmailByOrderId,
  };
}
