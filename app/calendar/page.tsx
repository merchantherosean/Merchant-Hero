"use client";

import { useState } from "react";
import { Calendar as CalIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { MONTHS } from "@/lib/types";

export default function CalendarPage() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const isToday = (day: number) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          Calendar
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Track important dates and deadlines
        </p>
      </div>

      <div
        className="rounded-xl p-6 border max-w-2xl"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg transition-colors cursor-pointer"
            style={{ color: "var(--text-secondary)" }}
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            {MONTHS[currentMonth]} {currentYear}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg transition-colors cursor-pointer"
            style={{ color: "var(--text-secondary)" }}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="text-center text-xs font-semibold py-2"
              style={{ color: "var(--text-muted)" }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center rounded-lg text-sm ${
                day ? "cursor-pointer" : ""
              }`}
              style={{
                background: day && isToday(day) ? "#5B8C2A" : "transparent",
                color: day
                  ? isToday(day)
                    ? "white"
                    : "var(--text-primary)"
                  : "transparent",
              }}
              onMouseEnter={(e) => {
                if (day && !isToday(day)) {
                  e.currentTarget.style.background = "var(--bg-tertiary)";
                }
              }}
              onMouseLeave={(e) => {
                if (day && !isToday(day)) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {day || ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
