export type ExternalPostFormOptions = {
  action: string;
  fields: Record<string, unknown>;
  target?: string;
  documentRef?: Document;
};

export function submitExternalPostForm({
  action,
  fields,
  target,
  documentRef = document,
}: ExternalPostFormOptions): HTMLFormElement {
  const form = documentRef.createElement("form");
  form.method = "POST";
  form.action = action;
  if (target) form.target = target;

  Object.entries(fields).forEach(([name, value]) => {
    const input = documentRef.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = String(value || "");
    form.appendChild(input);
  });

  documentRef.body.appendChild(form);
  form.submit();
  return form;
}
