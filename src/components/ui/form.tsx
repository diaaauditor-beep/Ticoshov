"use client";
import { createContext, useActionState, useContext, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/forms";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;
const Ctx = createContext<ActionState>({});
const ErrCtx = createContext<Record<string, string>>({});
export const useFormState = () => useContext(Ctx);

export function ActionForm({
  action, children, className, errors, success, onSuccessReset = false, id,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  /** localized error messages keyed by error code */
  errors: Record<string, string>;
  success?: string;
  onSuccessReset?: boolean;
  id?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && onSuccessReset) ref.current?.reset();
  }, [state, onSuccessReset]);
  return (
    <Ctx.Provider value={state}>
     <ErrCtx.Provider value={errors}>
      <form ref={ref} action={formAction} className={className} id={id} noValidate={false}>
        {state.error && (
          <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors[state.error] ?? errors.generic ?? state.error}
          </div>
        )}
        {state.ok && (success || state.message) && (
          <div role="status" className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {state.message ?? success}
          </div>
        )}
        {children}
      </form>
     </ErrCtx.Provider>
    </Ctx.Provider>
  );
}

export function SubmitButton({ children, className = "btn btn-primary", pendingLabel, name, value }: {
  children: ReactNode; className?: string; pendingLabel?: string; name?: string; value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending} name={name} value={value}>
      {pending && <span className="size-3.5 animate-spin rounded-full border-2 border-current border-e-transparent" aria-hidden />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

type Common = { name: string; label?: string; hint?: string; required?: boolean; className?: string };

function Wrap({ name, label, hint, required, className, children }: Common & { children: ReactNode }) {
  const state = useFormState();
  const messages = useContext(ErrCtx);
  const code = state.fieldErrors?.[name];
  const err = code ? messages[code] ?? code : undefined;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={`f-${name}`} className="label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {err ? <p className="field-error">{err}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function TextField(props: Common & React.InputHTMLAttributes<HTMLInputElement>) {
  const { name, label, hint, required, className, defaultValue, ...rest } = props;
  const state = useFormState();
  return (
    <Wrap name={name} label={label} hint={hint} required={required} className={className}>
      <input id={`f-${name}`} name={name} required={required} className="input"
        defaultValue={state.values?.[name] ?? defaultValue} {...rest} />
    </Wrap>
  );
}

export function TextArea(props: Common & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { name, label, hint, required, className, defaultValue, rows = 4, ...rest } = props;
  const state = useFormState();
  return (
    <Wrap name={name} label={label} hint={hint} required={required} className={className}>
      <textarea id={`f-${name}`} name={name} required={required} rows={rows} className="input"
        defaultValue={state.values?.[name] ?? defaultValue} {...rest} />
    </Wrap>
  );
}

export function SelectField(props: Common & React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: Array<{ value: string; label: string }>; placeholder?: string;
}) {
  const { name, label, hint, required, className, defaultValue, options, placeholder, ...rest } = props;
  const state = useFormState();
  return (
    <Wrap name={name} label={label} hint={hint} required={required} className={className}>
      <select id={`f-${name}`} name={name} required={required} className="input"
        defaultValue={(state.values?.[name] ?? defaultValue ?? "") as string} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Wrap>
  );
}

export function FileField(props: Common & { accept?: string; multiple?: boolean }) {
  const { name, label, hint, required, className, accept, multiple } = props;
  return (
    <Wrap name={name} label={label} hint={hint} required={required} className={className}>
      <input id={`f-${name}`} type="file" name={name} required={required} accept={accept} multiple={multiple}
        className="block w-full text-sm text-slate-600 file:me-3 file:rounded-md file:border-0 file:bg-navy-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-navy-800 hover:file:bg-navy-100" />
    </Wrap>
  );
}

/** A one-button form for simple actions (with optional browser confirmation). */
export function ActionButton({ action, children, className = "btn btn-secondary btn-sm", confirm, hidden, errors }: {
  action: Action; children: ReactNode; className?: string; confirm?: string;
  hidden?: Record<string, string>; errors: Record<string, string>;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="inline-flex flex-col items-start gap-1"
      onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}>
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <SubmitButton className={className}>{children}</SubmitButton>
      {state.error && <span className="text-xs text-red-600">{errors[state.error] ?? errors.generic}</span>}
    </form>
  );
}
