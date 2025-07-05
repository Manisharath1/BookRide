/* eslint-disable react/prop-types */
import { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, Trash, X, Check, Edit, Plus, Users, MapPin, Car } from 'lucide-react';

// eslint-disable-next-line react/prop-types
const CalendarSelector = ({ setSelectedTime, existingEvents, selectedTime, defaultTime, booking, calendarConfig, scrollToTime, highlightTrigger }) => {
  // State for tracking dates and selections
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [showSharedRideModal, setShowSharedRideModal] = useState(false);
  const [selectedSharedRide, setSelectedSharedRide] = useState(null);
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState('individual'); // 'individual' or 'shared'
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
  // Add this state
  // eslint-disable-next-line no-unused-vars
  const [highlightedSlots, setHighlightedSlots] = useState(new Set());

  
  // Refs for time grid and container
  const timeGridRef = useRef(null);
  const calendarBodyRef = useRef(null);

  useEffect(() => {
    if (calendarConfig?.eventClick) {
      // Store the parent's event click handler
      window.parentEventClickHandler = calendarConfig.eventClick;
      
    }
  }, [calendarConfig]);

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
  
    // let formattedExternalEvents = [];
    if (existingEvents && Array.isArray(existingEvents)) {
    const formattedExternalEvents = existingEvents.map(ev => {
      const startDate = new Date(ev.start);
      const endDate = new Date(ev.end);
      
      return {
        id: ev.id,
        title: ev.title,
        date: startDate,
        startTime: `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`,
        endTime: `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`,
        type: ev.extendedProps?.type || 'individual',
        status: ev.extendedProps?.status || 'pending',
        participantCount: ev.extendedProps?.participantCount,
        destinations: ev.extendedProps?.destinations,
        bookings: ev.extendedProps?.bookings,
        pickupLocation: ev.extendedProps?.pickupLocation,
        destination: ev.extendedProps?.dropLocation,
        color: 'bg-green-500 text-white',
        readOnly: true
      };
    });

    setEvents(prev => {
      const localEvents = prev.filter(e => !e.readOnly);
      return [...localEvents, ...formattedExternalEvents];
    });
  }
}, [existingEvents]);
    
  // Save events to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('calendarEvents', JSON.stringify(events));
  }, [events]);

  // Effect to handle container heights
  useEffect(() => {
    const adjustHeight = () => {
      if (calendarBodyRef.current) {
        const viewportHeight = window.innerHeight;
        const headerHeight = 100;
        const availableHeight = viewportHeight - headerHeight - 40;
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
        // Find the specific booking that was clicked
        const clickedTime = selectedTime.getTime();
        const targetEvent = events.find(event => 
          event.date instanceof Date && 
          Math.abs(event.date.getTime() - clickedTime) < 60000 // Within 1 minute
        );
        setTimeout(() => {
          // Scroll to the time slot
          const timeString = `${selectedTime.getHours().toString().padStart(2, '0')}:${selectedTime.getMinutes().toString().padStart(2, '0')}`;
          const timeElement = document.querySelector(`[data-time="${timeString}"]`);
          if (timeElement) {
            timeElement.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);

        if (targetEvent) {
          const targetElement = document.getElementById(`event-${targetEvent.id}`);
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
            // Add highlighting
            targetElement.style.animation = 'pulse 1s';
            setTimeout(() => {
              targetElement.style.animation = '';
            }, 2000);
          }
        }
      }, 300); // Increased timeout to ensure rendering is complete
    }
    }, [selectedTime, events]);

    useEffect(() => {
      if (defaultTime && booking?.duration) {
        setCurrentView('day');
        setCurrentDate(new Date(defaultTime));
        setSelectedDate(new Date(defaultTime));
        
        const startHour = defaultTime.getHours();
        const startMinute = defaultTime.getMinutes();
        const durationHours = booking.duration;
        
        // Auto-select this time slot for the parent
        if (setSelectedTime && !selectedTime) {
          setSelectedTime(new Date(defaultTime));
        }

        // Calculate end time
        const endTime = new Date(defaultTime.getTime() + (durationHours * 60 * 60 * 1000));
        const endHour = endTime.getHours();
        const endMinute = endTime.getMinutes();

        // Create the event
        const requestedTimeBlock = {
          id: 'requested-booking-time',
          title: `${booking.reason || 'Booking Request'} (${durationHours}h)`,
          date: new Date(defaultTime),
          startTime: `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`,
          endTime: `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`,
          color: 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg border-2 border-green-700',
          readOnly: true,
          type: 'booking-request'
        };

        setEvents(prev => {
          const filtered = prev.filter(e => e.id !== 'requested-booking-time');
          return [...filtered, requestedTimeBlock];
        });

        // Scroll and highlight after DOM updates - reduced delay and no automatic highlighting
        setTimeout(() => {
          const scrollTime = startMinute >= 30 ? `${startHour}:30` : `${startHour}:00`;
          const timeElement = document.querySelector(`[data-time="${scrollTime}"]`);
          if (timeElement) {
            timeElement.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 800); // Increased delay to ensure rendering is complete
      }
    }, [defaultTime, booking]);

  // Add this effect to handle the highlight trigger from parent
  useEffect(() => {
    if (highlightTrigger > 0 && selectedTime && booking?.duration) {
      // Force switch to day view if not already
      if (currentView !== 'day') {
        setCurrentView('day');
        setCurrentDate(new Date(selectedTime));
        setSelectedDate(new Date(selectedTime));
      }

      // Use a longer delay and only trigger once per highlightTrigger value
      const timeoutId = setTimeout(() => {
        const startHour = selectedTime.getHours();
        const startMinute = selectedTime.getMinutes();
        const durationHours = booking.duration;
        
        console.log('Highlight trigger activated:', { startHour, startMinute, durationHours });
        
        // Clear any existing highlights first
        setHighlightedSlots(new Set());
        
        // Then set new highlights after a brief pause
        setTimeout(() => {
          highlightTimeSlots(startHour, startMinute, durationHours);
          
          // Scroll to the time
          const scrollTime = startMinute >= 30 ? `${startHour}:30` : `${startHour}:00`;
          const timeElement = document.querySelector(`[data-time="${scrollTime}"]`);
          if (timeElement) {
            timeElement.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [highlightTrigger]);

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

  // Drag selection handlers
  const handleDragStart = (time, day = selectedDate) => {
    setIsDragging(true);
    setDragStart(time);
    setDragEnd(time);
    setSelectedDate(day);
  };

  const handleDragOver = (time) => {
    if (isDragging) {
      setDragEnd(time);
      setTooltipContent(`${formatDisplayTime(dragStart)} - ${formatDisplayTime(time)}`);
    }
  };

  const handleDragEnd = () => {
    if (isDragging && dragStart && dragEnd) {
      const start = dragStart < dragEnd ? dragStart : dragEnd;
      const end = dragStart < dragEnd ? dragEnd : dragStart;
      
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

  // Enhanced event management with shared ride support
  const handleEditEvent = (event) => {
    if (event.type === 'shared') {
      setSelectedSharedRide(event);
      setShowSharedRideModal(true);
    } else {
      setEditingEvent(event);
      setEventName(event.title);
      setEventType(event.type || 'individual');
      setTimeRange({ start: event.startTime, end: event.endTime });
      setSelectedDate(new Date(event.date));
      setShowModal(true);
    }
  };

  const showSharedRideDetails = (sharedRideData) => {
    // Handle both event object and extendedProps object
    const rideData = sharedRideData.extendedProps || sharedRideData;
    
    setSelectedSharedRide({
      ...rideData,
      startTime: sharedRideData.startTime,
      endTime: sharedRideData.endTime,
      title: sharedRideData.title
    });
    setShowSharedRideModal(true);
  };

  const handleEventClick = (event) => {

    if (setSelectedTime) {
      const eventDateTime = new Date(
        event.date.toISOString().split('T')[0] + 'T' + event.startTime + ':00'
      );
      setSelectedTime(eventDateTime);
    }

    // If it's the requested booking, highlight it again
    if (event.type === 'booking-request' && booking?.duration) {
      const startTime = new Date(event.date.toISOString().split('T')[0] + 'T' + event.startTime + ':00');
      highlightTimeSlots(startTime.getHours(), startTime.getMinutes(), booking.duration);
    }
    // If parent has custom event click handler, use it
    if (window.parentEventClickHandler && event.readOnly) {
      const mockInfo = {
        event: {
          start: new Date(event.date.toISOString().split('T')[0] + 'T' + event.startTime + ':00'),
          extendedProps: {
            type: event.type,
            bookings: event.bookings,
            destinations: event.destinations,
            participantCount: event.participantCount,
            booking: {
              pickupLocation: event.pickupLocation,
              location: event.destination,
              status: event.status
            }
          }
        }
      };
      window.parentEventClickHandler(mockInfo);
      return;
    }

    // Your existing logic for local events
    if (event.type === 'shared') {
      showSharedRideDetails(event);
    } else {
      if (setSelectedTime) {
        setSelectedTime(new Date(
          event.date.toISOString().split('T')[0] + 'T' + event.startTime + ':00'
        ));
      }
      handleEditEvent(event);
    }
  };

  const handleSaveEvent = () => {
    if (!eventName || !timeRange.start || !timeRange.end) return;

    if (editingEvent) {
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
    const colors = [
      'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md',
      'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md',
      'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md',
      'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md',
      'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md',
      'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const getEventColor = (event) => {
    if (event.type === 'booking-request') {
      return 'bg-gradient-to-r from-green-700 to-green-400 text-white shadow-lg border-2 border-green-900 ml-2 z-10';
    } else if (event.type === 'approved' || event.readOnly) {
      return 'bg-gradient-to-r from-blue-800 to-blue-500 text-white shadow-md border-l-4 border-blue-900';
    } else if (event.type === 'shared') {
      return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md border-l-4 border-purple-700';
    } else {
      return event.color || 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md border-l-4 border-blue-700';
    }
  };

  const highlightTimeSlots = (startHour, startMinute, durationHours) => {
    console.log('Highlighting slots:', { startHour, startMinute, durationHours });
    
    // Clear existing highlights first
    setHighlightedSlots(new Set());
    
    // Create a visual highlight block similar to events
    requestAnimationFrame(() => {
      const timeHeight = 40;
      const startPos = ((startHour * 60 + startMinute) / 30) * timeHeight;
      const eventHeight = (durationHours * 60 / 30) * timeHeight;
      
      // Remove any existing highlight block
      const existingHighlight = document.getElementById('time-highlight-block');
      if (existingHighlight) {
        existingHighlight.remove();
      }
      
      // Create new highlight block
      const highlightBlock = document.createElement('div');
      highlightBlock.id = 'time-highlight-block';
      highlightBlock.className = 'absolute ml-2 mr-1 px-2 py-1 rounded-md pointer-events-none z-30 ';
      highlightBlock.style.cssText = `
        top: ${startPos}px;
        height: ${eventHeight}px;
        left: 0%;
        width: calc(100% - 16px);
      `;
          
      // Add to the events container
      const eventsContainer = document.querySelector('.absolute.top-0.left-24');
      if (eventsContainer) {
        eventsContainer.appendChild(highlightBlock);
      }
      
      // Clear highlight after 4 seconds
      setTimeout(() => {
        console.log('Clearing highlights');
        const highlightToRemove = document.getElementById('time-highlight-block');
        if (highlightToRemove) {
          highlightToRemove.remove();
        }
      }, 4000);
    });
  };

  const getEventIcon = (event) => {
    if (event.type === 'shared') {
      return <Users size={12} className="mr-1" />;
    } else {
      return <Car size={12} className="mr-1" />;
    }
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
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {  
      days.push(<div key={`empty-${i}`} className="h-36 bg-gray-50/50 border border-gray-100 rounded-lg"></div>);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = isSameDay(new Date(), date);
      const isSelected = selectedDate && isSameDay(selectedDate, date);
      
      const dayEvents = events.filter(event => 
        event.date instanceof Date && isSameDay(event.date, date)
      );

      days.push(
        <div 
          key={`day-${day}`} 
          className={`h-36 border border-gray-100 p-3 rounded-lg transition-all duration-200 hover:shadow-md ${
            isToday 
              ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200' 
              : 'bg-white hover:bg-gray-50'
          } ${
            isSelected 
              ? 'ring-2 ring-blue-400 shadow-lg' 
              : ''
          } relative cursor-pointer`}
          onClick={() => handleDateClick(date)}
        >
          <div className="flex justify-between items-start">
            <span className={`inline-flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full transition-colors ${
              isToday 
                ? 'bg-blue-500 text-white shadow-md' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}>
              {day}
            </span>
            {dayEvents.length > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                {dayEvents.length}
              </span>
            )}
          </div>
          <div className="mt-2 space-y-1 max-h-20 overflow-y-auto">
            {dayEvents.slice(0, 3).map(event => (
              <div 
                key={event.id} 
                className={`text-xs p-1.5 rounded-md truncate ${getEventColor(event)} hover:opacity-90 transition-opacity cursor-pointer relative`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEventClick(event);
                }}
                title={event.type === 'shared' ? 
                  `Shared Ride - ${event.participantCount || '2+'} passengers` : 
                  `Individual Ride - ${event.title}`
                }
              >
                <div className="flex items-center">
                  {getEventIcon(event)}
                  <span className="font-medium truncate">{event.title}</span>
                </div>
                <div className="text-xs opacity-90 flex items-center">
                  <Clock size={10} className="mr-1" />
                  {formatDisplayTime(event.startTime)}
                </div>
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-7 gap-2">
        {daysOfWeek.map(day => (
          <div key={day} className="py-3 text-center text-sm font-semibold text-gray-600 bg-gray-50 rounded-lg">
            {day}
          </div>
        ))}
        {days}
      </div>
    );
  };

  const renderDayView = () => {
    const timeHeight = 40;
    const dayEvents = events.filter(event => {
      if (!event.date) return false;
      const eventDate = event.date instanceof Date ? event.date : new Date(event.date);
      const result = isSameDay(eventDate, selectedDate);
      // console.log('Event date check:', { 
      //   eventId: event.id, 
      //   eventDate, 
      //   selectedDate, 
      //   isSameDay: result,
      //   eventStartTime: event.startTime,
      //   eventEndTime: event.endTime
      // });
      return result;
    });

    // console.log('Day events for selected date:', dayEvents);

    const processOverlappingEvents = (events) => {
      const sortedEvents = [...events].sort((a, b) => a.startTime - b.startTime);
      const processedEvents = [];

      for (let i = 0; i < sortedEvents.length; i++) {
        const event = sortedEvents[i];
        let overlaps = [];

        for (let j = 0; j < sortedEvents.length; j++) {
          if (i === j) continue;

          const other = sortedEvents[j];
          if (event.startTime < other.endTime && event.endTime > other.startTime) {
            overlaps.push(other);
          }
        }

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

        sortedEvents.splice(i + 1, group.length - 1);
      }

      return processedEvents;
    };

    const processedEvents = processOverlappingEvents(dayEvents);

    const getTimePosition = (time) => {
      const [hour, minute] = time.split(':').map(Number);
      const totalMinutes = hour * 60 + minute;
      const slotIndex = Math.floor(totalMinutes / 30);
      // console.log('getTimePosition:', { time, hour, minute, totalMinutes, slotIndex, position: slotIndex * timeHeight });
      return slotIndex * timeHeight;
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" onMouseMove={handleMouseMove}>
        <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 rounded-t-xl">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h3>
          <p className="text-sm text-gray-600 flex items-center">
            <Plus size={14} className="mr-1" />
            Drag to select a time range or click on events
          </p>
        </div>
        <div 
          className="divide-y divide-gray-100 overflow-y-auto overflow-x-hidden relative" 
          style={{ height: 'calc(100vh - 240px)' }}
          ref={timeGridRef}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          {timeSlots.map((time, index) => {
            const isInDragRange = isDraggedOver(time);
            const isHour = time.endsWith(':00');
            
            return (
              <div 
                key={time} 
                data-time={time} 
                className={`flex h-10 relative transition-colors duration-300 ${
                  isInDragRange 
                    ? 'bg-gradient-to-r from-blue-100 to-blue-50' 
                    : 'hover:bg-gray-50'
                } ${isHour ? 'border-t-2 border-gray-200' : 'border-t border-gray-100'}`}
                onMouseDown={() => handleDragStart(time)}
                onMouseOver={() => handleDragOver(time)}
              >
                <div className={`w-24 py-2 px-3 text-xs flex items-center justify-end border-r border-gray-200 bg-white z-20 ${
                  isHour ? 'font-semibold text-gray-700' : 'text-gray-500'
                }`}>
                  {isHour ? formatDisplayTime(time) : ''}
                </div>
                <div className="flex-1 relative">
                </div>
              </div>
            );
          })}
          
          <div className="absolute top-0 left-24 right-0 h-full pointer-events-none">
            {processedEvents.map(event => {
              const startPos = getTimePosition(event.startTime);
              const endPos = getTimePosition(event.endTime);
              const eventHeight = endPos - startPos || timeHeight;
              
              const width = 100 / event.totalInGroup;
              const left = width * event.position;
              
              return (
                <div 
                  key={event.id}
                  id={`event-${event.id}`}
                  className={`absolute ml-1 mr-2 px-2 py-1 rounded-md cursor-pointer z-10 group pointer-events-auto overflow-hidden ${getEventColor(event)} hover:z-10`}
                  style={{
                    top: `${startPos}px`,
                    height: `${eventHeight}px`,
                    left: `${left}%`,
                    width: `calc(${width}% - 24px)`,
                     // Ensure it doesn't overflow
                  }}
                  onClick={() => handleEventClick(event)}
                  
                >
                  <div className="flex flex-col h-full justify-center">
                    <div className="flex items-center mb-1">
                      {getEventIcon(event)}
                      <span className="font-semibold text-xs truncate ml-1">{event.title}</span>
                    </div>
                    <div className="text-xs opacity-90 truncate flex items-center">
                      <Clock size={8} className="mr-1" />
                      <span className="truncate">{formatDisplayTime(event.startTime)} - {formatDisplayTime(event.endTime)}</span>
                    </div>
                    {event.type === 'shared' && (
                      <div className="text-xs opacity-80 flex items-center mt-1">
                        <Users size={8} className="mr-1" />
                        <span className="truncate">{event.participantCount || '2+'} passengers</span>
                      </div>
                    )}
                    <div className="opacity-0 group-hover:opacity-100 absolute top-1 right-1 transition-opacity">
                      <button 
                        className="p-0.5 bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-sm" 
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
    const timeHeight = 40;
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100" onMouseMove={handleMouseMove}>
        <div className="flex border-b border-gray-200">
          <div className="w-20 flex flex-col border-r border-gray-200">
            <div className="h-16 flex items-center justify-center text-sm font-semibold text-gray-600 bg-gray-50 rounded-tl-xl">
              Time
            </div>
            {timeSlots.map((time, idx) => {
              const isHour = time.endsWith(':00');
              return (
                <div key={idx} className={`h-10 border-t flex items-center justify-end border-gray-100 text-xs px-3 ${
                  isHour ? 'font-semibold text-gray-700 border-t-2 border-gray-200' : 'text-gray-500'
                }`}>
                  {isHour ? formatDisplayTime(time) : ''}
                </div>
              );
            })}
          </div>

          <div className="flex-1 overflow-x-auto">
            <div className="grid grid-cols-7 min-w-[700px] border-b border-gray-200">
              {weekDays.map((day, idx) => {
                const isToday = isSameDay(new Date(), day);
                const isSelected = isSameDay(selectedDate, day);

                return (
                  <div
                    key={`header-${idx}`}
                    className={`h-16 text-center border-l border-gray-200 cursor-pointer transition-colors duration-200 ${
                      isToday 
                        ? 'bg-gradient-to-b from-blue-50 to-blue-100' 
                        : 'hover:bg-gray-50'
                    } ${
                      isSelected 
                        ? 'ring-2 ring-blue-400 ring-inset' 
                        : ''
                    } ${
                      idx === 6 ? 'rounded-tr-xl' : ''
                    }`}
                    onClick={() => handleDateClick(day)}
                  >
                    <p className="text-sm font-semibold text-gray-700 mt-2">{daysOfWeek[idx]}</p>
                    <p className={`text-lg font-bold ${
                      isToday ? 'text-blue-600' : 'text-gray-800'
                    }`}>
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
                    {timeSlots.map((time, rowIndex) => {
                      const isInDragRange =
                        isDragging &&
                        isSameDay(day, selectedDate) &&
                        isDraggedOver(time);
                      const isHour = time.endsWith(':00');

                      return (
                        <div
                          key={`${colIndex}-${rowIndex}`}
                          className={`h-10 relative transition-colors duration-150 ${
                            isInDragRange 
                              ? 'bg-gradient-to-r from-blue-100 to-blue-50' 
                              : 'hover:bg-gray-50'
                          } ${
                            isHour ? 'border-t-2 border-gray-200' : 'border-t border-gray-100'
                          }`}
                          onClick={() => setSelectedDate(day)}
                          onMouseDown={() => handleDragStart(time, day)}
                          onMouseOver={() => {
                            if (isDragging && isSameDay(day, selectedDate)) handleDragOver(time);
                          }}
                        />
                      );
                    })}

                    {(() => {
                      const overlappingGroups = [];
                      const processedEvents = [...dayEvents];
                      
                      while (processedEvents.length > 0) {
                        const currentEvent = processedEvents.shift();
                        const currentGroup = [currentEvent];
                        
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
                              className={`absolute rounded-lg px-2 py-1 cursor-pointer z-10 group transition-all duration-200 hover:scale-105 ${getEventColor(event)}`}
                              style={{
                                top: `${top}px`,
                                height: `${height}px`,
                                width: `calc(${width}% - 4px)`,
                                left: `${left}%`,
                              }}
                              onClick={() => handleEventClick(event)}
                              title={event.type === 'shared' ? 
                                `Shared Ride - ${event.participantCount || '2+'} passengers` : 
                                `Individual Ride - ${event.title}`
                              }
                            >
                              <div className="flex items-center">
                                {getEventIcon(event)}
                                <span className="font-semibold truncate text-xs">
                                  {event.title}
                                </span>
                              </div>
                              <div className="text-xs opacity-90 flex items-center">
                                <Clock size={8} className="mr-1" />
                                {formatDisplayTime(event.startTime)}
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 absolute top-1 right-1 transition-opacity">
                                <button
                                  className="p-0.5 bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-sm"
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

  // Add this useEffect to handle scrollToTime prop
  useEffect(() => {
    if (scrollToTime && currentView === 'day') {
      setTimeout(() => {
        const hour = scrollToTime.getHours();
        const minute = scrollToTime.getMinutes();
        const timeString = `${hour.toString().padStart(2, '0')}:${minute >= 30 ? '30' : '00'}`;
        
        const timeElement = document.querySelector(`[data-time="${timeString}"]`);
        if (timeElement) {
          timeElement.scrollIntoView({ behavior: "smooth", block: "center" });
          
          // Add temporary highlight
          timeElement.classList.add('bg-blue-100', 'border-blue-300', 'border-2');
          setTimeout(() => {
            timeElement.classList.remove('bg-blue-100', 'border-blue-300', 'border-2');
          }, 2000);
        }
      }, 300);
    }
  }, [scrollToTime, currentView]);

  return (
    <div className="min-h-screen overflow-hidden">
      <div className="max-w-full mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
          {/* Enhanced Calendar Header */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-gray-200/50">
            <div className="flex flex-col sm:flex-row items-center justify-between p-6">
              <div className="flex items-center space-x-6 mb-4 sm:mb-0">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={handlePrevious} 
                    className="p-2 rounded-xl hover:bg-white/60 transition-all duration-200 shadow-sm border border-white/20"
                  >
                    <ChevronLeft size={18} className="text-gray-600" />
                  </button>
                  <button 
                    onClick={handleNext} 
                    className="p-2 rounded-xl hover:bg-white/60 transition-all duration-200 shadow-sm border border-white/20"
                  >
                    <ChevronRight size={18} className="text-gray-600" />
                  </button>
                </div>
                
                <div className="text-center sm:text-left">
                  <h3 className="text-xl font-bold text-gray-800 mb-1">
                    {getHeaderDate()}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {currentView.charAt(0).toUpperCase() + currentView.slice(1)} view
                  </p>
                </div>
                
                <button 
                  onClick={goToToday} 
                  className="px-4 py-2 text-sm bg-white/70 hover:bg-white transition-all duration-200 rounded-xl text-gray-700 font-medium shadow-sm border border-white/30"
                >
                  Today
                </button>
              </div>
              
              <div className="flex space-x-1 bg-white/50 p-1 rounded-xl border border-white/30">
                <button 
                  onClick={() => setCurrentView('month')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    currentView === 'month' 
                      ? 'bg-white text-blue-600 shadow-md' 
                      : 'text-gray-600 hover:bg-white/60'
                  }`}
                >
                  Month
                </button>
                <button 
                  onClick={() => setCurrentView('week')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    currentView === 'week' 
                      ? 'bg-white text-blue-600 shadow-md' 
                      : 'text-gray-600 hover:bg-white/60'
                  }`}
                >
                  Week
                </button>
                <button 
                  onClick={() => setCurrentView('day')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    currentView === 'day' 
                      ? 'bg-white text-blue-600 shadow-md' 
                      : 'text-gray-600 hover:bg-white/60'
                  }`}
                >
                  Day
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Body */}
          <div 
            className="p-4 overflow-hidden mb-4" 
            ref={calendarBodyRef}
            onMouseUp={handleDragEnd}
          >
            <div className={currentView !== 'month' ? 'h-full' : 'overflow-hidden'}>
              {currentView === 'month' && renderMonthView()}
              {currentView === 'week' && renderWeekView()}
              {currentView === 'day' && renderDayView()}
            </div>  
          </div>
        </div>
      </div>

      {/* Enhanced Dragging tooltip */}
      {showTooltip && (
        <div 
          className="fixed bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm py-2 px-4 rounded-xl pointer-events-none z-50 shadow-lg border border-white/20 backdrop-blur-sm"
          style={{ left: tooltipPosition.x, top: tooltipPosition.y }}
        >
          <div className="flex items-center space-x-2">
            <Clock size={14} />
            <span>{tooltipContent}</span>
          </div>
        </div>
      )}

      {/* Enhanced Event Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">
                    {editingEvent ? 'Edit Event' : 'Create New Event'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {editingEvent ? 'Update event details' : 'Add a new event to your calendar'}
                  </p>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/60 rounded-xl transition-all duration-200"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Event Name
                </label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                  value={eventName} 
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Enter event name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Event Type
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="individual"
                      checked={eventType === 'individual'}
                      onChange={(e) => setEventType(e.target.value)}
                      className="mr-2"
                    />
                    <Car size={16} className="mr-1" />
                    Individual Ride
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="shared"
                      checked={eventType === 'shared'}
                      onChange={(e) => setEventType(e.target.value)}
                      className="mr-2"
                    />
                    <Users size={16} className="mr-1" />
                    Shared Ride
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date
                </label>
                <div className="flex items-center px-4 py-3 border border-gray-300 rounded-xl bg-gray-50">
                  <Calendar size={18} className="text-blue-500 mr-3" />
                  <span className="font-medium text-gray-700">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Time
                  </label>
                  <div className="relative">
                    <Clock size={18} className="absolute top-3.5 left-4 text-blue-500" />
                    <select 
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none bg-white"
                      value={timeRange.start}
                      onChange={(e) => setTimeRange({...timeRange, start: e.target.value})}
                    >
                      <option value="">Select time</option>
                      {timeSlots.map(time => (
                        <option key={`start-${time}`} value={time}>
                          {formatDisplayTime(time)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Time
                  </label>
                  <div className="relative">
                    <Clock size={18} className="absolute top-3.5 left-4 text-blue-500" />
                    <select 
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none bg-white"
                      value={timeRange.end}
                      onChange={(e) => setTimeRange({...timeRange, end: e.target.value})}
                    >
                      <option value="">Select time</option>
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
            
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200 gap-4">
              {editingEvent ? (
                <button 
                  onClick={handleDeleteEvent}
                  className="flex items-center px-4 py-2 border border-red-300 text-red-600 rounded-xl hover:bg-red-50 transition-all duration-200 font-medium"
                >
                  <Trash size={16} className="mr-2" />
                  Delete Event
                </button>
              ) : (
                <div></div>
              )}
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium text-gray-700"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEvent}
                  className="flex items-center px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!eventName || !timeRange.start || !timeRange.end}
                >
                  <Check size={16} className="mr-2" />
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shared Ride Details Modal */}
      {showSharedRideModal && selectedSharedRide && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Users size={24} className="text-purple-600 mr-3" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      Shared Ride Details
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedSharedRide.participantCount || '2+'} passengers • {formatDisplayTime(selectedSharedRide.startTime)}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSharedRideModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/60 rounded-xl transition-all duration-200"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
                  <div className="flex items-center">
                    <Clock size={18} className="text-purple-600 mr-3" />
                    <div>
                      <p className="font-semibold text-gray-800">Departure Time</p>
                      <p className="text-sm text-gray-600">
                        {formatDisplayTime(selectedSharedRide.startTime)} - {formatDisplayTime(selectedSharedRide.endTime)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 flex items-center">
                    <MapPin size={16} className="mr-2" />
                    Destinations
                  </h4>
                  {selectedSharedRide.bookings ? (
                    <div className="space-y-2">
                      {selectedSharedRide.bookings.map((booking, index) => (
                        <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-semibold mr-3">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">
                              {booking.pickupLocation || 'Unknown Pickup'} → {booking.location || 'Unknown Destination'}
                            </p>
                            <p className="text-sm text-gray-600">
                              Status: {booking.status || 'pending'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-600">
                      <p>{selectedSharedRide.destinations || 'Multiple destinations'}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center">
                    <Users size={18} className="text-blue-600 mr-3" />
                    <div>
                      <p className="font-semibold text-gray-800">Total Passengers</p>
                      <p className="text-sm text-gray-600">{selectedSharedRide.participantCount || '2+'} people</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-200">
              <button 
                onClick={() => setShowSharedRideModal(false)}
                className="px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all duration-200 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default CalendarSelector;