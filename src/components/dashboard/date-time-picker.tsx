"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DateTimePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  className?: string;
}

export function DateTimePicker({ value, onChange, className }: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value);
  const [selectedHour, setSelectedHour] = useState<string>(
    value ? String(value.getHours()).padStart(2, "0") : "12"
  );
  const [selectedMinute, setSelectedMinute] = useState<string>(
    value ? String(value.getMinutes()).padStart(2, "0") : "00"
  );

  useEffect(() => {
    if (value) {
      setSelectedDate(value);
      setSelectedHour(String(value.getHours()).padStart(2, "0"));
      setSelectedMinute(String(value.getMinutes()).padStart(2, "0"));
    }
  }, [value]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const newDate = new Date(date);
      newDate.setHours(parseInt(selectedHour), parseInt(selectedMinute));
      setSelectedDate(newDate);
      onChange(newDate);
    } else {
      setSelectedDate(undefined);
      onChange(undefined);
    }
  };

  const handleTimeChange = (hour?: string, minute?: string) => {
    const hourValue = hour ?? selectedHour;
    const minuteValue = minute ?? selectedMinute;
    
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(parseInt(hourValue), parseInt(minuteValue));
      setSelectedDate(newDate);
      onChange(newDate);
    } else {
      // If no date is selected, use today's date
      const today = new Date();
      today.setHours(parseInt(hourValue), parseInt(minuteValue));
      setSelectedDate(today);
      onChange(today);
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

  return (
    <div className={cn("space-y-3", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal bg-white/5 border-[#ff073a]/30 text-white hover:bg-[#ff073a]/10",
              !selectedDate && "text-white/50"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? (
              format(selectedDate, "PPP HH:mm")
            ) : (
              <span className="text-white/50">Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-[#0a0a0a] border-[#ff073a]/30" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            className="bg-[#0a0a0a]"
          />
        </PopoverContent>
      </Popover>

      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-white/70" />
        <div className="flex items-center gap-2 flex-1">
          <Select
            value={selectedHour}
            onValueChange={(value) => {
              setSelectedHour(value);
              handleTimeChange(value, undefined);
            }}
          >
            <SelectTrigger className="flex-1 bg-white/5 border-[#ff073a]/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0a0a0a] border-[#ff073a]/30 max-h-[200px]">
              {hours.map((hour) => (
                <SelectItem
                  key={hour}
                  value={hour}
                  className="text-white hover:bg-[#ff073a]/20"
                >
                  {hour}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-white/70">:</span>
          <Select
            value={selectedMinute}
            onValueChange={(value) => {
              setSelectedMinute(value);
              handleTimeChange(undefined, value);
            }}
          >
            <SelectTrigger className="flex-1 bg-white/5 border-[#ff073a]/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0a0a0a] border-[#ff073a]/30 max-h-[200px]">
              {minutes.map((minute) => (
                <SelectItem
                  key={minute}
                  value={minute}
                  className="text-white hover:bg-[#ff073a]/20"
                >
                  {minute}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

