/**
 * Input Component — JnUVerse Stitch Design System
 * Crisp 1px border, surface-white base, Plus Jakarta Sans typography, and accessible error states.
 */
export default function Input({
  label,
  id,
  name,
  type = "text",
  value,
  onChange,
  placeholder = "",
  error = "",
  helperText = "",
  required = false,
  disabled = false,
  icon = null,
  rightElement = null,
  className = "",
  autoComplete,
  ...props
}) {
  const inputId = id || name;

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold tracking-wide text-on-surface uppercase"
        >
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3.5 text-text-muted/70 flex items-center pointer-events-none">
            {icon}
          </div>
        )}

        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          className={`w-full h-11 bg-surface-white text-on-surface placeholder:text-text-muted/50 rounded-xl font-normal text-sm transition-all duration-200 outline-none shadow-xs disabled:bg-surface-lavender/40 disabled:cursor-not-allowed ${
            icon ? "pl-11" : "pl-4"
          } ${rightElement ? "pr-11" : "pr-4"} ${
            error
              ? "border border-error bg-error-container/10 focus:border-error focus:ring-2 focus:ring-error/20"
              : "border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/15"
          }`}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3 flex items-center">{rightElement}</div>
        )}
      </div>

      {error ? (
        <p id={`${inputId}-error`} className="text-xs font-medium text-error mt-0.5">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${inputId}-helper`} className="text-xs text-text-muted mt-0.5">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
