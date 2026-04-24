type DashboardFormControl =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

export function getDashboardFormControl(
  id: string,
): DashboardFormControl | null {
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

export function getDashboardFormControlValue(id: string): string {
  return getDashboardFormControl(id)?.value.trim() || "";
}

export function getDashboardInputChecked(id: string): boolean {
  const element = document.getElementById(id);
  return element instanceof HTMLInputElement ? element.checked : false;
}
