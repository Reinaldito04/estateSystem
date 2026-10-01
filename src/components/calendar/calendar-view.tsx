"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  backgroundColor: string;
  borderColor: string;
  extendedProps: Record<string, unknown>;
};

export function CalendarView({
  events,
  onRangeChange,
  onDateClick,
  onEventClick,
}: {
  events: CalendarEvent[];
  onRangeChange: (from: string, to: string) => void;
  onDateClick: (date: string) => void;
  onEventClick: (event: CalendarEvent) => void;
}) {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      headerToolbar={{
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay",
      }}
      locale={esLocale}
      height="auto"
      dayMaxEvents={4}
      events={events}
      datesSet={(arg) => onRangeChange(arg.startStr, arg.endStr)}
      dateClick={(arg) => onDateClick(arg.dateStr)}
      eventClick={(arg) => {
        const raw = arg.event.toPlainObject();
        onEventClick({
          id: raw.id ?? arg.event.id,
          title: arg.event.title,
          start: arg.event.startStr,
          end: arg.event.endStr,
          allDay: arg.event.allDay,
          backgroundColor: arg.event.backgroundColor,
          borderColor: arg.event.borderColor,
          extendedProps: (arg.event.extendedProps ?? {}) as Record<string, unknown>,
        });
      }}
      eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
    />
  );
}
