import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { fr } from "date-fns/locale";
import { parseAnyDate, formatDateFR, toISODate } from "@/lib/date-utils";

type ChangeLike = { target: { value: string } };

interface DateInputProps {
  value?: string | null;
  onChange?: (e: ChangeLike) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
}

/**
 * Drop-in replacement for <Input type="date" /> that displays dates in
 * French dd/MM/yyyy format regardless of browser locale, while keeping
 * the same ISO YYYY-MM-DD string contract on value/onChange.
 */
export function DateInput({
  value,
  onChange,
  className,
  disabled,
  placeholder = "jj/mm/aaaa",
  id,
}: DateInputProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseAnyDate(value) ?? undefined;

  const emit = (iso: string) => onChange?.({ target: { value: iso } });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 opacity-60" />
          {selected ? formatDateFR(selected) : <span>{placeholder}</span>}
          {selected && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); emit(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); emit(""); } }}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
              aria-label="Effacer la date"
            >
              ✕
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={fr}
          selected={selected}
          onSelect={(d) => {
            emit(d ? toISODate(d) : "");
            setOpen(false);
          }}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

export default DateInput;
