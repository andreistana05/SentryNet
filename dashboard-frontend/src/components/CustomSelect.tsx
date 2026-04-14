import { useEffect, useId, useMemo, useRef, useState } from "react";

interface CustomSelectOption {
  label: string;
  value: string;
}

interface CustomSelectProps {
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

function CustomSelect({ value, options, onChange, disabled = false, ariaLabel }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonId = useId();
  const listboxId = `${buttonId}-listbox`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isInteractive = !disabled && options.length > 0;
  const isMenuOpen = isOpen && isInteractive;

  const selectedOption = useMemo(() => {
    return options.find((option) => option.value === value) ?? options[0] ?? null;
  }, [options, value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleToggle() {
    if (!isInteractive) return;
    setIsOpen((current) => !current);
  }

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setIsOpen(false);
  }

  return (
    <div ref={rootRef} className={`custom-select ${isMenuOpen ? "is-open" : ""} ${disabled ? "is-disabled" : ""}`}>
      <button
        id={buttonId}
        type="button"
        className="custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={isMenuOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={handleToggle}
      >
        <span className="custom-select-value">{selectedOption?.label ?? "Select an option"}</span>
        <span className="custom-select-chevron" aria-hidden="true" />
      </button>

      {isMenuOpen ? (
        <div className="custom-select-menu" role="listbox" id={listboxId} aria-labelledby={buttonId}>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                className={`custom-select-option ${isSelected ? "is-selected" : ""}`}
                aria-selected={isSelected}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default CustomSelect;
