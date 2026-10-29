import React, { useState } from 'react';
import { useChef } from '../../context/ChefContext';
import { KitchenEvent, EventCategory } from '../../types/events';
import { AddEditEventModal } from './AddEditEventModal';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  UtensilsCrossed,
  Plus,
  Edit3,
  Trash2,
  Share2,
  CheckCircle2,
  Flame,
  AlertTriangle,
  RefreshCw,
  Search,
  ChevronRight,
  Filter,
} from 'lucide-react';

export const EventScheduleView: React.FC = () => {
  const {
    activeProfile,
    events,
    createEvent,
    updateEvent,
    deleteEvent,
    pushBanquetMenuToPrep,
    syncEventWithGoogle,
    establishmentProfile,
    terminology,
  } = useChef();

  const isBOH = activeProfile === 'BOH_KITCHEN';

  // Filters
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<KitchenEvent | null>(null);

  // Interaction feedback states
  const [dispatchedEventId, setDispatchedEventId] = useState<string | null>(null);
  const [syncingEventId, setSyncingEventId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Time boundaries
  const now = Date.now();
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const endOfToday = new Date().setHours(23, 59, 59, 999);
  const endOfWeek = startOfToday + 7 * 86400000;
  const endOfMonth = startOfToday + 30 * 86400000;

  // Filtered Events
  const filteredEvents = events
    .filter((event) => {
      // Date filter
      if (dateFilter === 'TODAY') {
        if (event.startTime < startOfToday || event.startTime > endOfToday) return false;
      } else if (dateFilter === 'WEEK') {
        if (event.startTime < startOfToday || event.startTime > endOfWeek) return false;
      } else if (dateFilter === 'MONTH') {
        if (event.startTime < startOfToday || event.startTime > endOfMonth) return false;
      }

      // Category filter
      if (categoryFilter !== 'ALL' && event.category !== categoryFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = event.title.toLowerCase().includes(q);
        const matchesLocation = event.location.toLowerCase().includes(q);
        const matchesClient = (event.clientName || '').toLowerCase().includes(q);
        const matchesMenu = (event.menuPlan || []).some((m) =>
          m.itemName.toLowerCase().includes(q)
        );
        if (!matchesTitle && !matchesLocation && !matchesClient && !matchesMenu) return false;
      }

      return true;
    })
    .sort((a, b) => a.startTime - b.startTime);

  // Metric Computations
  const totalGuaranteedGuests = events.reduce(
    (sum, e) => sum + (e.guaranteedHeadcount ?? e.expectedGuestCount),
    0
  );
  const totalEstimatedFoodCost = events.reduce((sum, e) => {
    return (
      sum +
      (e.menuPlan || []).reduce(
        (mSum, item) => mSum + item.targetPortions * item.estimatedCostPerPortion,
        0
      )
    );
  }, 0);
  const syncedEventsCount = events.filter((e) => e.isSyncedToGoogle).length;

  const handleOpenAddModal = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (event: KitchenEvent) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleSaveEvent = (eventData: any) => {
    if (editingEvent) {
      updateEvent(eventData);
    } else {
      createEvent(eventData);
    }
  };

  const handlePushToPrep = (eventId: string) => {
    const res = pushBanquetMenuToPrep(eventId);
    if (res.success) {
      setDispatchedEventId(eventId);
      setTimeout(() => setDispatchedEventId(null), 3500);
    }
  };

  const handleSyncGoogle = async (eventId: string) => {
    setSyncingEventId(eventId);
    await syncEventWithGoogle(eventId);
    setSyncingEventId(null);
  };

  const formatEventDateTime = (startTime: number, endTime: number) => {
    const start = new Date(startTime);
    const end = new Date(endTime);

    const dateStr = start.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const startTimeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const endTimeStr = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    return `${dateStr} · ${startTimeStr} – ${endTimeStr}`;
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Executive Schedule Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div
          className={`border rounded-2xl p-5 shadow-xs transition-colors ${
            isBOH
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{terminology.eventPluralLabel}</span>
            <Calendar className="w-5 h-5 text-indigo-700" />
          </div>
          <div className="text-3xl font-black font-mono">
            {events.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {events.filter((e) => e.status === 'IN_PREP').length} actively in line prep
          </div>
        </div>

        <div
          className={`border rounded-2xl p-5 shadow-xs transition-colors ${
            isBOH
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{terminology.guestPluralLabel}</span>
            <Users className="w-5 h-5 text-indigo-700" />
          </div>
          <div className="text-3xl font-black font-mono">
            {totalGuaranteedGuests.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total {terminology.guestLabel.toLowerCase()} headcount booked
          </div>
        </div>

        <div
          className={`border rounded-2xl p-5 shadow-xs transition-colors ${
            isBOH
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Menu Plan Valuation</span>
            <UtensilsCrossed className="w-5 h-5 text-indigo-700" />
          </div>
          <div className="text-3xl font-black font-mono">
            {establishmentProfile.currencySymbol}{totalEstimatedFoodCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Cumulative ingredient cost across courses
          </div>
        </div>

        <div
          className={`border rounded-2xl p-5 shadow-xs transition-colors ${
            isBOH
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Google Calendar Sync</span>
            <Share2 className="w-5 h-5 text-indigo-700" />
          </div>
          <div className="text-3xl font-black font-mono flex items-center gap-2">
            <span>{syncedEventsCount}</span>
            <span className="text-xs text-slate-400 font-sans font-normal">/ {events.length}</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Bi-directional sync adapter active</span>
          </div>
        </div>
      </div>

      {/* Toolbar: Date Tabs, Category Filters, Search & + Create Event CTA */}
      <div
        className={`border rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
          isBOH ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Date Timeline Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {(['ALL', 'TODAY', 'WEEK', 'MONTH'] as const).map((tab) => {
            const isSelected = dateFilter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setDateFilter(tab)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isSelected
                    ? isBOH
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'bg-indigo-900 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab === 'ALL'
                  ? 'All Upcoming'
                  : tab === 'TODAY'
                  ? 'Today'
                  : tab === 'WEEK'
                  ? 'Next 7 Days'
                  : 'Next 30 Days'}
              </button>
            );
          })}
        </div>

        {/* Right side: Search + "+ Create Event" Primary Action */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events, clients, dishes..."
              className={`w-full h-10 border rounded-xl pl-9 pr-3 text-xs focus:outline-hidden ${
                isBOH
                  ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-400 focus:border-amber-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white'
              }`}
            />
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
              isBOH
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 font-black'
                : 'bg-indigo-900 hover:bg-indigo-800 text-white shadow-indigo-950/20'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Event</span>
          </button>
        </div>
      </div>

      {/* Agenda Timeline Card List */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div
            className={`p-12 border rounded-2xl text-center shadow-xs ${
              isBOH
                ? 'bg-slate-900 border-slate-800 text-slate-400'
                : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No Kitchen Events Scheduled
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery
                ? `No events match "${searchQuery}" in this timeline range.`
                : 'No banquet, buffet, or catering functions booked in this view window.'}
            </p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="mt-4 px-4 py-2 bg-indigo-900 text-white text-xs font-bold rounded-xl hover:bg-indigo-800 transition-colors"
            >
              + Create First Kitchen Event
            </button>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const isDispatched = dispatchedEventId === event.id;
            const isSyncing = syncingEventId === event.id;
            const isDeleting = confirmDeleteId === event.id;

            const totalEventCost = (event.menuPlan || []).reduce(
              (sum, item) => sum + item.targetPortions * item.estimatedCostPerPortion,
              0
            );

            return (
              <div
                key={event.id}
                className={`border rounded-2xl p-5 shadow-xs transition-all ${
                  isBOH
                    ? 'bg-slate-900 border-slate-800 text-slate-100 hover:border-slate-700'
                    : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                }`}
              >
                {/* Event Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3.5">
                  <div>
                    {/* Time & Venue Metadata */}
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      <span className="font-bold text-indigo-700 dark:text-amber-400">
                        {formatEventDateTime(event.startTime, event.endTime)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {event.location}
                      </span>
                      {event.clientName && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Host: {event.clientName}</span>
                        </>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {event.title}
                    </h3>
                  </div>

                  {/* Status & Headcount Badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                        event.status === 'IN_PREP'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300'
                          : event.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {event.status}
                    </span>

                    <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-mono font-bold text-indigo-950 dark:text-indigo-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{event.expectedGuestCount} Exp</span>
                      <span className="text-slate-400 font-normal">/</span>
                      <span>{event.guaranteedHeadcount ?? event.expectedGuestCount} Gtd</span>
                    </div>
                  </div>
                </div>

                {/* Event Notes (if present) */}
                {event.eventNotes && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 mt-3 font-normal">
                    {event.eventNotes}
                  </p>
                )}

                {/* Banquet Menu Plan Preview */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <UtensilsCrossed className="w-3.5 h-3.5 text-indigo-600 dark:text-amber-400" />
                      <span>Attached Banquet Menu Plan ({event.menuPlan?.length || 0} courses)</span>
                    </span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      Est. Food Cost: {establishmentProfile.currencySymbol}{totalEventCost.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {(event.menuPlan || []).map((menuItem) => (
                      <div
                        key={menuItem.id}
                        className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                          <span>{menuItem.course}</span>
                          <span className="text-indigo-600 dark:text-amber-400 font-mono">
                            {menuItem.stationAssignment || 'Line'}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white truncate" title={menuItem.itemName}>
                          {menuItem.itemName}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          <span>{menuItem.targetPortions} portions</span>
                          <span>{establishmentProfile.currencySymbol}{(menuItem.targetPortions * menuItem.estimatedCostPerPortion).toFixed(2)}</span>
                        </div>
                        {menuItem.prepNotes && (
                          <div className="text-[10px] text-slate-400 truncate italic">
                            {menuItem.prepNotes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Controls: Push to Prep, Sync to Google, Edit, Delete */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                  {/* Left: Google Sync Indicator & Trigger */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSyncGoogle(event.id)}
                      disabled={isSyncing}
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                        event.isSyncedToGoogle
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 text-blue-800 dark:text-blue-300 hover:bg-blue-100'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                      title={event.googleCalendarEventId ? `Google ID: ${event.googleCalendarEventId}` : 'Sync with Google Calendar'}
                    >
                      <Share2 className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Syncing...' : event.isSyncedToGoogle ? 'Synced to Google' : 'Sync to Calendar'}</span>
                    </button>

                    {event.lastSyncedTimestamp && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        Last synced {new Date(event.lastSyncedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {/* Right Actions: Push to Prep, Edit, Delete */}
                  <div className="flex items-center gap-2">
                    {/* 1-Tap Push to Prep Cards */}
                    <button
                      type="button"
                      onClick={() => handlePushToPrep(event.id)}
                      className={`min-h-[40px] px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs ${
                        isDispatched
                          ? 'bg-emerald-600 text-white font-black'
                          : isBOH
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                          : 'bg-indigo-900 hover:bg-indigo-800 text-white'
                      }`}
                    >
                      {isDispatched ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Dispatched to Line Prep!</span>
                        </>
                      ) : (
                        <>
                          <Flame className="w-4 h-4" />
                          <span>Push to Prep Cards</span>
                        </>
                      )}
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(event)}
                      className="min-h-[40px] px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {/* Delete */}
                    {isDeleting ? (
                      <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/50 p-1 rounded-xl border border-rose-200">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1 text-xs text-slate-600 rounded hover:bg-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteEvent(event.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-rose-600 rounded hover:bg-rose-700 shadow-xs"
                        >
                          Confirm
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(event.id)}
                        className="min-h-[40px] px-2.5 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                        title="Delete event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Event Modal */}
      <AddEditEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEvent}
        initialEvent={editingEvent}
      />
    </div>
  );
};
