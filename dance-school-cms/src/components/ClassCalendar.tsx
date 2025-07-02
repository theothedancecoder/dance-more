'use client';

import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useUser } from '@clerk/nextjs';

interface ClassInstance {
  id: string;
  title: string;
  start: string;
  end: string;
  extendedProps: {
    classId: string;
    danceStyle: string;
    level: string;
    instructor: string;
    location: string;
    capacity: number;
    remainingCapacity: number;
    bookingCount: number;
    price: number;
    isCancelled: boolean;
    isBookable: boolean;
  };
  backgroundColor: string;
  borderColor: string;
}

interface ClassCalendarProps {
  isAdmin?: boolean;
}

export default function ClassCalendar({ isAdmin = false }: ClassCalendarProps) {
  const { user } = useUser();
  const [events, setEvents] = useState<ClassInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<ClassInstance | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [userSubscriptions, setUserSubscriptions] = useState<any[]>([]);

  useEffect(() => {
    fetchEvents();
    if (user) {
      fetchUserSubscriptions();
    }
  }, [user]);

  const fetchEvents = async () => {
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);

      const response = await fetch(
        `/api/classes/instances?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data.instances);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSubscriptions = async () => {
    try {
      const response = await fetch('/api/subscriptions');
      if (response.ok) {
        const data = await response.json();
        setUserSubscriptions(data.subscriptions);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    }
  };

  const handleEventClick = (clickInfo: any) => {
    setSelectedEvent(clickInfo.event);
    setShowModal(true);
  };

  const handleBookClass = async () => {
    if (!selectedEvent || !user) return;

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classInstanceId: selectedEvent.id,
        }),
      });

      if (response.ok) {
        alert('Class booked successfully!');
        setShowModal(false);
        fetchEvents(); // Refresh events
        fetchUserSubscriptions(); // Refresh subscriptions
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to book class');
      }
    } catch (error) {
      console.error('Error booking class:', error);
      alert('Failed to book class');
    }
  };

  const handleCancelClass = async (cancelSeries = false) => {
    if (!selectedEvent || !isAdmin) return;

    const reason = prompt('Cancellation reason (optional):');
    
    try {
      const response = await fetch('/api/admin/classes/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classInstanceId: selectedEvent.id,
          cancellationReason: reason,
          cancelEntireSeries: cancelSeries,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        setShowModal(false);
        fetchEvents(); // Refresh events
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to cancel class');
      }
    } catch (error) {
      console.error('Error cancelling class:', error);
      alert('Failed to cancel class');
    }
  };

  const canBookClass = () => {
    if (!user || !selectedEvent) return false;
    
    const { extendedProps } = selectedEvent;
    if (extendedProps.isCancelled || !extendedProps.isBookable) return false;

    // Check if user has valid subscription
    const now = new Date();
    const hasValidSubscription = userSubscriptions.some(sub => {
      const endDate = new Date(sub.endDate);
      if (endDate <= now || !sub.isActive) return false;
      
      if (sub.type === 'monthly') return true;
      if (['single', 'multi-pass', 'clipcard'].includes(sub.type)) {
        return sub.remainingClips > 0;
      }
      
      return false;
    });

    return hasValidSubscription;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        events={events}
        eventClick={handleEventClick}
        height="auto"
        eventDisplay="block"
        dayMaxEvents={3}
        moreLinkClick="popover"
      />

      {/* Event Details Modal */}
      {showModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">{selectedEvent.title}</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <p><strong>Style:</strong> {selectedEvent.extendedProps.danceStyle}</p>
              <p><strong>Level:</strong> {selectedEvent.extendedProps.level}</p>
              <p><strong>Instructor:</strong> {selectedEvent.extendedProps.instructor}</p>
              <p><strong>Location:</strong> {selectedEvent.extendedProps.location}</p>
              <p><strong>Date:</strong> {new Date(selectedEvent.start).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {new Date(selectedEvent.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p><strong>Price:</strong> ${selectedEvent.extendedProps.price}</p>
              <p><strong>Available Spots:</strong> {selectedEvent.extendedProps.remainingCapacity} / {selectedEvent.extendedProps.capacity}</p>
              
              {selectedEvent.extendedProps.isCancelled && (
                <p className="text-red-600 font-semibold">❌ This class has been cancelled</p>
              )}
            </div>

            <div className="flex gap-3">
              {!isAdmin && user && canBookClass() && (
                <button
                  onClick={handleBookClass}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  Book Class
                </button>
              )}

              {!isAdmin && user && !canBookClass() && !selectedEvent.extendedProps.isCancelled && (
                <div className="flex-1 text-center">
                  {userSubscriptions.length === 0 ? (
                    <p className="text-red-600 text-sm">No active subscription</p>
                  ) : (
                    <p className="text-red-600 text-sm">
                      {selectedEvent.extendedProps.remainingCapacity === 0 ? 'Class is full' : 'No valid subscription'}
                    </p>
                  )}
                </div>
              )}

              {isAdmin && (
                <>
                  <button
                    onClick={() => handleCancelClass(false)}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                  >
                    Cancel Class
                  </button>
                  <button
                    onClick={() => handleCancelClass(true)}
                    className="flex-1 bg-red-800 text-white px-4 py-2 rounded hover:bg-red-900 transition-colors"
                  >
                    Cancel Series
                  </button>
                </>
              )}

              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
