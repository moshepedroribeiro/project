interface SpinnerProps {
  size?: number;
  className?: string;
}

/**
 * Spinner SVG animado para estados de loading.
 */
export function Spinner({ size = 20, className = '' }: SpinnerProps) {
  return (
    <svg
      className={`spinner ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Carregando..."
      role="status"
    >
      <circle
        className="spinner-track"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        className="spinner-head"
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
