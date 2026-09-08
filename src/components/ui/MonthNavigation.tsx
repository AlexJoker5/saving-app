import { useId } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { isDisplayMonth, shiftMonth } from '../../lib/display-month';

export function MonthNavigation({
  month,
  min,
  onChange,
}: {
  month: string;
  min: string;
  onChange: (month: string) => void;
}) {
  const id = useId();
  const previous = shiftMonth(month, -1),
    next = shiftMonth(month, 1);

  return (
    <div className="month-navigation">
      <button
        className="icon-button"
        aria-label="Previous month"
        disabled={previous < min || !isDisplayMonth(previous)}
        onClick={() => onChange(previous)}
      >
        <ChevronLeft size={20} />
      </button>
      <label htmlFor={id} className="sr-only">
        Jump to month and year
      </label>
      <input
        id={id}
        type="month"
        value={month}
        min={min}
        onChange={(event) => {
          if (isDisplayMonth(event.target.value) && event.target.value >= min) {
            onChange(event.target.value);
          }
        }}
      />
      <button
        className="icon-button"
        aria-label="Next month"
        disabled={!isDisplayMonth(next)}
        onClick={() => onChange(next)}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
