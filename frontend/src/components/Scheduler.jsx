// src/components/Scheduler.jsx
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useState } from 'react';
import enUS from 'date-fns/locale/en-US';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function Scheduler({ selectedTime, setSelectedTime }) {
  const [events, setEvents] = useState([]);

  const handleSelectSlot = ({ start }) => {
    setSelectedTime(start);
    const newEvent = {
      start,
      end: new Date(start.getTime() + 60 * 60 * 1000),
      title: "Selected Time",
    };
    setEvents([newEvent]);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ height: 400 }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          defaultView="week"
          selectable
          onSelectSlot={handleSelectSlot}
          views={['week']}
          style={{ height: '100%' }}
        />
      </div>
    </DndProvider>
  );
}
