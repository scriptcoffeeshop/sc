type FormControlElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

function getFormControlElement(id: string): FormControlElement | null {
  const element = document.getElementById(id);
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return element;
  }
  return null;
}

export function getModalFormControlValue(id: string): string {
  return getFormControlElement(id)?.value.trim() || "";
}
