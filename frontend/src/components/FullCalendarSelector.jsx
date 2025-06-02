import { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, Trash, X, Check, Edit, Plus } from 'lucide-react';

// eslint-disable-next-line react/prop-types
const CalendarSelector = ({ setSelectedTime, existingEvents, selectedTime  = [] }) => {
  // State for tracking dates and selections
  const calendarRef = useRef(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('week'); // 'month', 'week', 'day'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [eventName, setEventName] = useState('');
  const [events, setEvents] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);
  
  // Drag selection states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [timeRange, setTimeRange] = useState({ start: '', end: '' });
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipContent, setTooltipContent] = useState('');
  
  // Refs for time grid and container
  const timeGridRef = useRef(null);
  const calendarBodyRef = useRef(null);

  // Load events from localStorage on component mount
  useEffect(() => {
    const savedEvents = localStorage.getItem('calendarEvents');
    let parsedLocalEvents = [];
    if (savedEvents) {
      try {
        // eslint-disable-next-line no-unused-vars
        parsedLocalEvents = JSON.parse(savedEvents).map(event => ({
          ...event,
          date: new Date(event.date)
        }));
      } catch (e) {
        console.error('Failed to parse saved events:', e);
      }
    }
  
    let formattedExternalEvents = [];
    if (existingEvents && Array.isArray(existingEvents)) {
      formattedExternalEvents = existingEvents
        // eslint-disable-next-line react/prop-types
        .filter(ev => ev?.date && ev?.startTime)
        .map(ev => ({
          ...ev,
          date: new Date(ev.date),
          readOnly: true
        }));
    }
  
    // const combined = [...parsedLocalEvents, ...formattedExternalEvents];
    setEvents(prev => {
      const newOnes = formattedExternalEvents.filter(ev => !prev.some(e => e.id === ev.id));
      return [...prev, ...newOnes];
    });
  }, [existingEvents]);
  
  // Save events to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('calendarEvents', JSON.stringify(events));
  }, [events]);

  // Effect to handle container heights
  useEffect(() => {
    const adjustHeight = () => {
      if (calendarBodyRef.current) {
        // Set a fixed height for the calendar body with scrolling
        const viewportHeight = window.innerHeight;
        const headerHeight = 100; // Approximate header height
        const availableHeight = viewportHeight - headerHeight - 40; // 40px for margins
        calendarBodyRef.current.style.height = `${Math.max(400, availableHeight)}px`;
      }
    };
    
    adjustHeight();
    window.addEventListener('resize', adjustHeight);
    return () => window.removeEventListener('resize', adjustHeight);
  }, []);

  // Get calendar data
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  // Navigation functions
  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const previousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
    setSelectedDate(newDate);
  };

  const previousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1);
    setCurrentDate(newDate);
    setSelectedDate(newDate);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
    setSelectedDate(newDate);
  };

  const nextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 1);
    setCurrentDate(newDate);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Handle navigation based on current view
  const handlePrevious = () => {
    if (currentView === 'month') previousMonth();
    else if (currentView === 'week') previousWeek();
    else previousDay();
  };

  const handleNext = () => {
    if (currentView === 'month') nextMonth();
    else if (currentView === 'week') nextWeek();
    else nextDay();
  };
  

  useEffect(() => {
    if (selectedTime instanceof Date) {
      setCurrentView('day');
      setCurrentDate(new Date(selectedTime));
      setSelectedDate(new Date(selectedTime));

      setTimeout(() => {
        const targetEvent = existingEvents.find(e =>
          e.date instanceof Date &&
          e.date.toDateString() === selectedTime.toDateString() &&
          selectedTime.getHours() === parseInt(e.startTime.split(":")[0])
        );

        if (targetEvent) {
          const el = document.getElementById(`event-${targetEvent.id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });

            el.classList.add("highlighted-event");
            setTimeout(() => {
              el.classList.remove("highlighted-event");
            }, 1000); // Remove after animation completes
          }
        }
      }, 200); // Delay to wait for render
    }
  }, [selectedTime]);



  // const isOverlapping = (eventA, eventB) => {
  //   if (eventA.date.toDateString() !== eventB.date.toDateString()) return false;
  //   return (
  //     eventA.startTime < eventB.endTime &&
  //     eventB.startTime < eventA.endTime
  //   );
  // };
  
  // Improved groupOverlappingEvents function
  
  // const groupOverlappingEvents = (events) => {
  //   if (!events.length) return [];
    
  //   // Sort events by start time
  //   const sortedEvents = [...events].sort((a, b) => {
  //     return a.startTime - b.startTime || b.endTime - a.endTime;
  //   });
    
  //   const groups = [];
  //   let currentGroup = [];
    
  //   sortedEvents.forEach(event => {
  //     // Find if this event can fit in any existing group
  //     const existingGroupIndex = currentGroup.findIndex(groupEvent => 
  //       event.startTime >= groupEvent.endTime || event.endTime <= groupEvent.startTime
  //     );
      
  //     if (existingGroupIndex !== -1) {
  //       // Event doesn't overlap with this group event
  //       currentGroup.push(event);
  //     } else {
  //       // Start a new group
  //       if (currentGroup.length) {
  //         groups.push([...currentGroup]);
  //       }
  //       currentGroup = [event];
  //     }
  //   });
    
  //   // Add the last group if not empty
  //   if (currentGroup.length) {
  //     groups.push([...currentGroup]);
  //   }
    
  //   return groups;
  // };

  // Format time functions
  const formatTime = (hour, minutes = 0) => {
    const h = hour % 24;
    const m = minutes === 0 ? '00' : '30';
    return `${h < 10 ? '0' + h : h}:${m}`;
  };
  
  const formatDisplayTime = (timeString) => {
    if (!timeString) return '';
    const [hourStr, minStr] = timeString.split(':');
    const hour = parseInt(hourStr, 10);
    const minutes = parseInt(minStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const displayMin = minutes === 0 ? '00' : '30';
    return `${displayHour}:${displayMin} ${ampm}`;
  };
  
  // Time slots from 5:00 AM to 9:00 PM in 30-minute intervals
  const timeSlots = Array.from({ length: (24 - 0) * 2 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minutes = i % 2 === 0 ? 0 : 30;
    return formatTime(hour, minutes);
  });

  // Days of the week
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Handle date click
  const handleDateClick = (date) => {
    setSelectedDate(date);
    if (currentView === 'month') {
      setCurrentView('day');
    }
  };

  // Create new event by clicking on add button
  const handleAddEvent = () => {
    // Default to current time rounded to nearest 30 min
    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes() >= 30 ? 30 : 0;
    const startTime = formatTime(hour, minutes);
    
    // Default end time is 1 hour later
    const endHour = minutes === 30 ? hour + 1 : hour;
    const endMinutes = minutes === 30 ? 0 : 30;
    const endTime = formatTime(endHour + 1, endMinutes);
    
    setTimeRange({ start: startTime, end: endTime });
    setEditingEvent(null);
    setEventName('');
    setShowModal(true);
  };

  // Drag selection handlers - FIXED to properly handle drag events
  const handleDragStart = (time, day = selectedDate) => {
    setIsDragging(true);
    setDragStart(time);
    setDragEnd(time);
    setSelectedDate(day);
  };

  const handleDragOver = (time) => {
    if (isDragging) {
      setDragEnd(time);
      // Update tooltip
      setTooltipContent(`${formatDisplayTime(dragStart)} - ${formatDisplayTime(time)}`);
    }
  };

  const handleDragEnd = () => {
    if (isDragging && dragStart && dragEnd) {
      // Ensure start time is always before end time
      const start = dragStart < dragEnd ? dragStart : dragEnd;
      const end = dragStart < dragEnd ? dragEnd : dragStart;
      
      // Only show modal if we have a meaningful selection (not just a click)
      if (start !== end) {
        setTimeRange({ start, end });
        setEditingEvent(null);
        setEventName('');
        setShowModal(true);
      }
      
      setIsDragging(false);
      setShowTooltip(false);
    }
  };

  // Calculate visual representation of dragged range
  const isDraggedOver = (time) => {
    if (!isDragging || !dragStart || !dragEnd) return false;
    const start = dragStart < dragEnd ? dragStart : dragEnd;
    const end = dragStart < dragEnd ? dragEnd : dragStart;
    return time >= start && time < end;
  };

  // Handle mouse move for tooltip
  const handleMouseMove = (e) => {
    if (isDragging) {
      setTooltipPosition({ x: e.clientX + 10, y: e.clientY + 10 });
      setShowTooltip(true);
    }
  };

  // Event management
  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setEventName(event.title);
    setTimeRange({ start: event.startTime, end: event.endTime });
    setSelectedDate(new Date(event.date));
    setShowModal(true);
  };


  const handleSaveEvent = () => {
    if (!eventName || !timeRange.start || !timeRange.end) return;

    if (editingEvent) {
      // Update existing event
      setEvents(prev => prev.map(e => 
        e.id === editingEvent.id
          ? { 
              ...e, 
              title: eventName, 
              startTime: timeRange.start,
              endTime: timeRange.end 
            }
          : e
      ));
    } else {
      // Create new event
      const newEvent = {
        id: Date.now().toString(),
        title: eventName,
        date: selectedDate,
        startTime: timeRange.start,
        endTime: timeRange.end,
        color: getRandomColor()
      };
      setEvents([...events, newEvent]);
    }

    setShowModal(false);
    setEventName('');
    setTimeRange({ start: '', end: '' });
    setEditingEvent(null);

    if (setSelectedTime) {
      setSelectedTime(
        new Date(
          selectedDate.toISOString().split('T')[0] + 'T' + timeRange.start + ':00'
        )
      );
    }
  };

  const handleDeleteEvent = () => {
    if (editingEvent) {
      setEvents(prev => prev.filter(e => e.id !== editingEvent.id));
    }
    setShowModal(false);
    setEditingEvent(null);
  };

  const getRandomColor = () => {
    const colors = ['bg-blue-700', 'bg-green-700', 'bg-purple-700', 'bg-orange-700', 'bg-yellow-700', 'bg-pink-700'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Helper to check if two dates are the same day
  const isSameDay = (date1, date2) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  // Create calendar grid
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    // Create grid with placeholders for days before the first of the month
    const days = [];
    for (let i = 0; i < firstDay; i++) {  
      days.push(<div key={`empty-${i}`} className="h-32 bg-gray-50 border border-gray-200"></div>);
    }
    
    // Add the actual days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = isSameDay(new Date(), date);
      const isSelected = selectedDate && isSameDay(selectedDate, date);
      
      // Get events for this day
      const dayEvents = events.filter(event => 
        event.date instanceof Date && isSameDay(event.date, date)
      );

      days.push(
        <div 
          key={`day-${day}`} 
          className={`h-32 border border-gray-200 p-1 ${isToday ? 'bg-blue-50' : 'bg-white'} ${isSelected ? 'ring-2 ring-blue-500' : ''} relative cursor-pointer`}
          onClick={() => handleDateClick(date)}
        >
          <div className="flex justify-between">
            <span className={`inline-flex items-center justify-center w-5 h-5 text-xs ${isToday ? 'bg-blue-500 text-white rounded-full' : ''}`}>
              {day}
            </span>
            {dayEvents.length > 0 && (
              <span className="text-xs bg-gray-100 text-gray-700 px-1 rounded">
                {dayEvents.length}
              </span>
            )}
          </div>
          <div className="mt-1 max-h-14 overflow-y-auto">
            {dayEvents.slice(0, 2).map(event => (
              <div 
                key={event.id} 
                className={`text-xs p-0.5 mb-0.5 rounded truncate text-white ${event.color} hover:opacity-90`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditEvent(event);
                }}
              >
                {formatDisplayTime(event.startTime).replace(/\s/g, '')} {event.title}
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500 hover:text-blue-500">+ {dayEvents.length - 2} more</div>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-7 gap-0">
        {/* Render day headers */}
        {daysOfWeek.map(day => (
          <div key={day} className="py-1 text-center text-xs font-medium text-gray-700 bg-gray-100">
            {day}
          </div>
        ))}
        {/* Render days */}
        {days}
      </div>
    );
  };

  const renderDayView = () => {
    const timeHeight = 32; // Reduced height for time slots (was 64px)
    const dayEvents = events.filter(event => 
      event.date instanceof Date && isSameDay(event.date, selectedDate)
    );
  
    // Process events to handle overlaps
    const processOverlappingEvents = (events) => {
      const sortedEvents = [...events].sort((a, b) => a.startTime - b.startTime);
      const processedEvents = [];
    
      for (let i = 0; i < sortedEvents.length; i++) {
        const event = sortedEvents[i];
        let overlaps = [];
    
        // Find overlapping events
        for (let j = 0; j < sortedEvents.length; j++) {
          if (i === j) continue;
    
          const other = sortedEvents[j];
          if (event.startTime < other.endTime && event.endTime > other.startTime) {
            overlaps.push(other);
          }
        }
    
        // Find all overlapping events including self
        const group = [event, ...overlaps].filter((e, idx, arr) =>
          arr.findIndex(ev => ev.id === e.id) === idx
        );
    
        group.forEach((e, index) => {
          processedEvents.push({
            ...e,
            totalInGroup: group.length,
            position: index,
          });
        });
    
        // Remove grouped events to avoid reprocessing
        sortedEvents.splice(i + 1, group.length - 1);
      }
    
      return processedEvents;
    };
  
    // Process events to handle overlaps
    const processedEvents = processOverlappingEvents(dayEvents);
  
    // Function to calculate correct time slot positions
    const getTimePosition = (time) => {
      const timeIndex = timeSlots.findIndex(t => t === time);
      if (timeIndex === -1) {
        // Try to parse manually in case time like '06:30' doesn't exist in timeSlots
        const [hour, minute] = time.split(':').map(Number);
        const totalMinutes = hour * 60 + minute;
        return Math.floor((totalMinutes - (5 * 60)) / 30) * timeHeight; // since your slots start from 5:00 AM
      }
      return timeIndex * timeHeight;
    };
  
    return (
      <div className="bg-white rounded-lg" onMouseMove={handleMouseMove}>
        <div className="p-2 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h3>
          <p className="text-xs text-gray-500">Drag to select a time range</p>
        </div>
        <div 
          className="divide-y divide-gray-200 overflow-y-auto relative" 
          style={{ height: 'calc(100vh - 140px)' }}
          ref={timeGridRef}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          {timeSlots.map((time, index) => {
            const isInDragRange = isDraggedOver(time);
            
            return (
              <div 
                key={time} 
                className={`flex h-8 relative ${isInDragRange ? 'bg-blue-100' : 'hover:bg-gray-50'}`}
                onMouseDown={() => handleDragStart(time)}
                onMouseOver={() => handleDragOver(time)}
              >
                <div className="w-24 py-1 px-1 text-xs text-gray-800 font-bold flex items-center justify-center border-r border-gray-200">
                  {formatDisplayTime(time)}
                </div>
                <div className="flex-1 relative"></div>
              </div>
            );
          })}
          
          {/* Render events as continuous blocks */}
          <div className="absolute top-0 left-24 right-0 h-full pointer-events-none">
            {processedEvents.map(event => {
              // Calculate position and height based on event times
              const startPos = getTimePosition(event.startTime);
              const endPos = getTimePosition(event.endTime);
              const eventHeight = endPos - startPos || timeHeight; // Minimum height of one time slot
              
              // Calculate width and position based on overlapping status
              const width = 100 / event.totalInGroup;
              const left = width * event.position;
              
              return (
                <div 
                  key={event.id}
                  id={`event-${event.id}`}
                  className={`absolute mx-1 px-1 py-0.5 rounded-md text-black ${event.color } cursor-pointer z-10 group pointer-events-auto overflow-hidden`}
                  style={{
                    top: `${startPos}px`,
                    height: `${eventHeight}px`,
                    left: `${left}%`,
                    width: `calc(${width}% - 2px)`,
                  }}
                  onClick={() => handleEditEvent(event)}
                >
                  <div className="flex flex-col h-full">
                    <div className="font-medium text-xs truncate">{event.title}</div>
                    <div className="text-xs truncate">
                      {formatDisplayTime(event.startTime)} - {formatDisplayTime(event.endTime)}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 absolute top-1 right-1 flex space-x-1">
                      <button 
                        className="p-0.5 bg-white/20 hover:bg-white/40 rounded" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditEvent(event);
                        }}
                      >
                        <Edit size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const timeHeight = 32; // Reduced height for time slots
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
  
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });
  
    return (
      <div className="bg-white rounded-lg" onMouseMove={handleMouseMove}>
        <div className="flex">
          {/* Time column */}
          <div className="w-20 flex flex-col border-r border-gray-300">
            <div className="h-8 pl-1 text-lg items-center justify-center text-gray-600 flex ">Time</div>
            {timeSlots.map((time, idx) => (
              <div key={idx} className="h-8 border-t flex font-bold items-center justify-center border-gray-200 text-xs text-gray-800 pl-1 pt-1">
                {formatDisplayTime(time)}
              </div>
            ))}
          </div>
  
          {/* Weekly grid */}
          <div className=" flex-1 overflow-x-auto">
            <div className="grid grid-cols-7 min-w-[700px] border-b border-gray-300">
              {weekDays.map((day, idx) => {
                const isToday = isSameDay(new Date(), day);
                const isSelected = isSameDay(selectedDate, day);
  
                return (
                  <div
                    key={`header-${idx}`}
                    className={`h-8 text-center border-l border-gray-200 cursor-pointer ${
                      isToday ? 'bg-blue-50' : ''
                    } ${isSelected ? 'ring-1 ring-blue-500 ring-inset' : ''}`}
                    onClick={() => handleDateClick(day)}
                  >
                    <p className="text-xs font-medium text-gray-800">{daysOfWeek[idx]}</p>
                    <p className={`text-xs ${isToday ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                      {day.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>
  
            <div className="grid grid-cols-7 min-w-[700px]">
              {weekDays.map((day, colIndex) => {
                const dayEvents = events.filter(
                  event => event.date instanceof Date && isSameDay(event.date, day)
                );
  
                return (
                  <div key={colIndex} className="border-l border-gray-200 relative">
                    {/* Time slots */}
                    {timeSlots.map((time, rowIndex) => {
                      const isInDragRange =
                        isDragging &&
                        isSameDay(day, selectedDate) &&
                        isDraggedOver(time);
  
                      return (
                        <div
                          key={`${colIndex}-${rowIndex}`}
                          className={`h-8 border-t border-gray-200 relative ${isInDragRange ? 'bg-blue-100' : ''}`}
                          onClick={() => setSelectedDate(day)}
                          onMouseDown={() => handleDragStart(time, day)}
                          onMouseOver={() => {
                            if (isDragging && isSameDay(day, selectedDate)) handleDragOver(time);
                          }}
                        />
                      );
                    })}
  
                    {/* Events for this day */}
                    {(() => {
                      // First, group overlapping events
                      const overlappingGroups = [];
                      const processedEvents = [...dayEvents];
                      
                      while (processedEvents.length > 0) {
                        const currentEvent = processedEvents.shift();
                        const currentGroup = [currentEvent];
                        
                        // Find all events that overlap with currentEvent
                        for (let i = 0; i < processedEvents.length; i++) {
                          const event = processedEvents[i];
                          if (
                            (event.startTime < currentEvent.endTime && event.endTime > currentEvent.startTime) ||
                            (currentEvent.startTime < event.endTime && currentEvent.endTime > event.startTime)
                          ) {
                            currentGroup.push(event);
                            processedEvents.splice(i, 1);
                            i--;
                          }
                        }
                        
                        overlappingGroups.push(currentGroup);
                      }
                      
                      // eslint-disable-next-line no-unused-vars
                      return overlappingGroups.map((group, groupIndex) => {
                        return group.map((event, eventIndex) => {
                          const startIndex = timeSlots.findIndex(t => t === event.startTime);
                          const endIndex = timeSlots.findIndex(t => t === event.endTime);
                          if (startIndex === -1 || endIndex === -1) return null;
                          
                          const top = startIndex * timeHeight;
                          const height = (endIndex - startIndex) * timeHeight;
                          const width = 100 / group.length;
                          const left = width * eventIndex;
                          
                          return (
                            <div
                              key={event.id}
                              className={`absolute text-white text-xs rounded-md px-1 py-0.5 ${event.color} z-10 group`}
                              style={{
                                top: `${top}px`,
                                height: `${height}px`,
                                width: `calc(${width}% - 2px)`,
                                left: `${left}%`,
                              }}
                              onClick={() => handleEditEvent(event)}
                            >
                              <div className="font-medium truncate text-xs">
                                {event.title}
                              </div>
                              <div className="text-xs">
                                {formatDisplayTime(event.startTime)}
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 absolute top-0.5 right-0.5 flex space-x-0.5">
                                <button
                                  className="p-0.5 bg-white/20 hover:bg-white/40 rounded"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditEvent(event);
                                  }}
                                >
                                  <Edit size={10} />
                                </button>
                              </div>
                            </div>
                          );
                        });
                      });
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };
  

  // Format the header date range based on current view
  const getHeaderDate = () => {
    if (currentView === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (currentView === 'week') {
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      const startMonth = startOfWeek.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = endOfWeek.toLocaleDateString('en-US', { month: 'short' });
      
      return `${startMonth} ${startOfWeek.getDate()} - ${endMonth} ${endOfWeek.getDate()}, ${endOfWeek.getFullYear()}`;
    } else {
      return selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  return (
    <div className=" min-h-screen ">
      <div className="max-w-full mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          {/* <h2 className="text-2xl font-bold text-gray-800">Booking Calendar</h2> */}
          <div className="text-sm text-gray-500">
            {isDragging && dragStart && dragEnd && (
              <span>
                Selecting: {formatDisplayTime(dragStart)} - {formatDisplayTime(dragEnd)}
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6 border-1 border-gray-800 ">
          {/* Calendar Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              <button onClick={handlePrevious} className="p-1 rounded-full hover:bg-gray-100">
                <ChevronLeft size={20} />
              </button>
              <button onClick={handleNext} className="p-1 rounded-full hover:bg-gray-100">
                <ChevronRight size={20} />
              </button>
              <h3 className="text-lg font-medium text-gray-800">
                {getHeaderDate()}
              </h3>
              <button 
                onClick={goToToday} 
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
              >
                Today
              </button>
            </div>
            
            <div className="flex space-x-2">
              <div className="flex border border-gray-200 rounded-md overflow-hidden">
                <button 
                  onClick={() => setCurrentView('month')}
                  className={`px-4 py-2 text-sm ${currentView === 'month' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  Month
                </button>
                <button 
                  onClick={() => setCurrentView('week')}
                  className={`px-4 py-2 text-sm ${currentView === 'week' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  Week
                </button>
                <button 
                  onClick={() => setCurrentView('day')}
                  className={`px-4 py-2 text-sm ${currentView === 'day' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  Day
                </button>
              </div>
              <button 
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={handleAddEvent}
              >
                <Plus size={16} className="mr-1" />
                Add Event
              </button>
            </div>
          </div>

          {/* Calendar Body */}
          <div 
            className="p-2 overflow-hidden" 
            ref={calendarBodyRef}
            onMouseUp={handleDragEnd}
          >
            <div className={currentView !== 'month' ? 'h-full overflow-y-auto' : ''}>
              {currentView === 'month' && renderMonthView()}
              {currentView === 'week' && renderWeekView()}
              {currentView === 'day' && renderDayView()}
            </div>
          </div>
        </div>
      </div>

      {/* Dragging tooltip */}
      {showTooltip && (
        <div 
          className="fixed bg-black text-white text-xs py-1 px-2 rounded pointer-events-none z-50"
          style={{ left: tooltipPosition.x, top: tooltipPosition.y }}
        >
          {tooltipContent}
        </div>
      )}

      {/* Event Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                {editingEvent ? 'Edit Event' : 'New Event'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Name
                </label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" 
                  value={eventName} 
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Enter event name"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <div className="flex items-center px-3 py-2 border border-gray-300 rounded-md">
                  <Calendar size={18} className="text-gray-400 mr-2" />
                  <span>{selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
              
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <div className="relative">
                    <Clock size={18} className="absolute top-2.5 left-3 text-gray-400" />
                    <select 
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={timeRange.start}
                      onChange={(e) => setTimeRange({...timeRange, start: e.target.value})}
                    >
                      {timeSlots.map(time => (
                        <option key={`start-${time}`} value={time}>
                          {formatDisplayTime(time)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <div className="relative">
                    <Clock size={18} className="absolute top-2.5 left-3 text-gray-400" />
                    <select 
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={timeRange.end}
                      onChange={(e) => setTimeRange({...timeRange, end: e.target.value})}
                    >
                      {timeSlots.filter(time => time > timeRange.start).map(time => (
                        <option key={`end-${time}`} value={time}>
                          {formatDisplayTime(time)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-4 py-3 flex justify-between border-t">
              {editingEvent ? (
                <button 
                  onClick={handleDeleteEvent}
                  className="flex items-center px-3 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50"
                >
                  <Trash size={16} className="mr-1" />
                  Delete
                </button>
              ) : (
                <div></div>
              )}
              
              <div className="flex space-x-2">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEvent}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={!eventName || !timeRange.start || !timeRange.end}
                >
                  <Check size={16} className="mr-1" />
                  {editingEvent ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}

export default CalendarSelector;