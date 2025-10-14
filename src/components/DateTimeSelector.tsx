'use client';

import { useState, useEffect } from 'react';

interface ScheduleItem {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

interface DateTimeSelectorProps {
  schedule: ScheduleItem[];
  onDateTimeSelect: (dateTime: string) => void;
}

export default function DateTimeSelector({ schedule, onDateTimeSelect }: DateTimeSelectorProps) {
  const [selectedDateTime, setSelectedDateTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<Array<{ dateTime: string; display: string }>>([]);

  useEffect(() => {
    generateAvailableSlots();
  }, [schedule]);

  const generateAvailableSlots = () => {
    const slots: Array<{ dateTime: string; display: string }> = [];
    const now = new Date();

    // Generate slots for the next 4 weeks
    for (let week = 0; week < 4; week++) {
      schedule.forEach((scheduleItem) => {
        const dayIndex = getDayIndex(scheduleItem.dayOfWeek);
        const slotDate = new Date(now);
        slotDate.setDate(now.getDate() + week * 7 + (dayIndex - now.getDay() + 7) % 7);

        // Skip past dates
        if (slotDate < now) return;

        const [startHour, startMinute] = scheduleItem.startTime.split(':').map(Number);
        const [endHour, endMinute] = scheduleItem.endTime.split(':').map(Number);

        slotDate.setHours(startHour, startMinute, 0, 0);

        const dateTimeString = slotDate.toISOString();
        const displayString = `${slotDate.toLocaleDateString()} at ${scheduleItem.startTime} - ${scheduleItem.endTime}`;

        slots.push({
          dateTime: dateTimeString,
          display: displayString
        });
      });
    }

    // Sort by date
    slots.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    setAvailableSlots(slots);
  };

  const getDayIndex = (dayName: string): number => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days.indexOf(dayName.toLowerCase());
  };

  const handleSelection = (dateTime: string) => {
    setSelectedDateTime(dateTime);
    onDateTimeSelect(dateTime);
  };

  if (availableSlots.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">No upcoming class sessions available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Select a Class Session</h3>

      <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
        {availableSlots.map((slot, index) => (
          <button
            key={index}
            onClick={() => handleSelection(slot.dateTime)}
            className={`p-3 text-left border rounded-lg transition-colors ${
              selectedDateTime === slot.dateTime
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="font-medium">{slot.display}</div>
          </button>
        ))}
      </div>

      {selectedDateTime && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">
            ✅ Selected: {availableSlots.find(s => s.dateTime === selectedDateTime)?.display}
          </p>
        </div>
      )}
    </div>
  );
}
