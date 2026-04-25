export type StorefrontBodyController = {
  applyPageClass: () => void;
  setCartDrawerOpen: (open: boolean) => void;
  restore: () => void;
};

export function createStorefrontBodyController(
  documentRef: Document = document,
): StorefrontBodyController {
  const originalBodyClass = documentRef.body.className;
  const originalBodyOverflow = documentRef.body.style.overflow;

  return {
    applyPageClass: () => {
      documentRef.body.className = "p-4 md:p-6";
    },
    setCartDrawerOpen: (open: boolean) => {
      documentRef.body.style.overflow = open ? "hidden" : originalBodyOverflow;
    },
    restore: () => {
      documentRef.body.className = originalBodyClass;
      documentRef.body.style.overflow = originalBodyOverflow;
    },
  };
}
