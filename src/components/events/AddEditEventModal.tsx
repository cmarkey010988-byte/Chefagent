import React, { useState, useEffect } from 'react';
import { useChef } from '../../context/ChefContext';
import {
  KitchenEvent,
  EventCategory,
  EventStatus,
  BanquetMenuItem,
  BanquetCourse,
} from '../../types/events';
import {
  X,
  Check,
  Plus,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Users,
  UtensilsCrossed,
  DollarSign,
  Share2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

interface AddEditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    event: Omit<KitchenEvent, 'id' | 'createdTimestamp' | 'updatedTimestamp'> | KitchenEvent
  ) => void;
  initialEvent?: KitchenEvent | null;
}

const CATEGORIES: { value: EventCategory; label: string }[] = [
  { value: 'BANQUET', label: 'Banquet Plated Dinner' },
  { value: 'BUFFET', label: 'Buffet & Action Stations' },
  { value: 'A_LA_CARTE_SPECIAL', label: 'A La Carte Line Special' },
  { value: 'CATERING_DELIVERY', label: 'Off-Premise Catering Delivery' },
  { value: 'KITCHEN_MAINTENANCE', label: 'Kitchen Deep Clean / Maintenance' },
  { value: 'STAFF_MEETING', label: 'BOH / FOH Operations Meeting' },
];

const LOCATIONS = [
  'Grand Ballroom',
  'Patio Bar & Terrace',
  'Main Dining Room',
  'Private Wine Cellar',
  'Founders Pavilion',
  'Poolside Veranda',
  'Main Kitchen Line',
];

const COURSES: { value: BanquetCourse; label: string }[] = [
  { value: 'APPETIZER', label: 'Appetizer / Hors d’Oeuvres' },
  { value: 'SALAD', label: 'Salad / Cold Starter' },
  { value: 'ENTREE', label: 'Main Entree' },
  { value: 'DESSERT', label: 'Plated / Finger Dessert' },
  { value: 'BUFFET_STATION', label: 'Buffet Action Station' },
  { value: 'BEVERAGE', label: 'Wine / Beverage Pairing' },
];

const STATIONS: ('Sauce/Sauté' | 'Butchery' | 'Garde Manger' | 'Pastry')[] = [
  'Sauce/Sauté',
  'Butchery',
  'Garde Manger',
  'Pastry',
];

export const AddEditEventModal: React.FC<AddEditEventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialEvent,
}) => {
  const { recipes, inventoryItems, terminology, establishmentProfile } = useChef();
  const isEditing = Boolean(initialEvent);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('BANQUET');
  const [status, setStatus] = useState<EventStatus>('PLANNED');
  const [location, setLocation] = useState('Grand Ballroom');
  const [clientName, setClientName] = useState('');
  const [eventNotes, setEventNotes] = useState('');
  const [expectedGuestCount, setExpectedGuestCount] = useState<number>(100);
  const [guaranteedHeadcount, setGuaranteedHeadcount] = useState<number>(90);
  const [isSyncedToGoogle, setIsSyncedToGoogle] = useState<boolean>(true);

  // Date/Time Strings for Inputs (YYYY-MM-DDTHH:mm)
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');

  // Banquet Menu Items
  const [menuPlan, setMenuPlan] = useState<BanquetMenuItem[]>([]);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toInputDateTime = (timestamp: number) => {
    const d = new Date(timestamp);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    if (initialEvent) {
      setTitle(initialEvent.title);
      setCategory(initialEvent.category);
      setStatus(initialEvent.status);
      setLocation(initialEvent.location);
      setClientName(initialEvent.clientName || '');
      setEventNotes(initialEvent.eventNotes || '');
      setExpectedGuestCount(initialEvent.expectedGuestCount);
      setGuaranteedHeadcount(initialEvent.guaranteedHeadcount ?? initialEvent.expectedGuestCount);
      setIsSyncedToGoogle(Boolean(initialEvent.isSyncedToGoogle));
      setStartDateTime(toInputDateTime(initialEvent.startTime));
      setEndDateTime(toInputDateTime(initialEvent.endTime));
      setMenuPlan(initialEvent.menuPlan ? [...initialEvent.menuPlan] : []);
    } else {
      const tomorrow = Date.now() + 86400000;
      const start = new Date(tomorrow);
      start.setHours(18, 0, 0, 0);
      const end = new Date(tomorrow);
      end.setHours(22, 0, 0, 0);

      setTitle('');
      setCategory('BANQUET');
      setStatus('PLANNED');
      setLocation('Grand Ballroom');
      setClientName('');
      setEventNotes('');
      setExpectedGuestCount(120);
      setGuaranteedHeadcount(110);
      setIsSyncedToGoogle(true);
      setStartDateTime(toInputDateTime(start.getTime()));
      setEndDateTime(toInputDateTime(end.getTime()));
      setMenuPlan([
        {
          id: `item-${Date.now()}-1`,
          recipeOrIngredientId: 'rec-1',
          itemName: 'Prime Beef Tenderloin Au Poivre',
          course: 'ENTREE',
          targetPortions: 110,
          estimatedCostPerPortion: 14.5,
          prepNotes: 'Center-cut PSMO portions, sear in waves.',
          stationAssignment: 'Butchery',
        },
        {
          id: `item-${Date.now()}-2`,
          recipeOrIngredientId: 'rec-5',
          itemName: 'Belgian Dark Callebaut Tartlet',
          course: 'DESSERT',
          targetPortions: 120,
          estimatedCostPerPortion: 2.8,
          prepNotes: 'Individual finger-plated presentation.',
          stationAssignment: 'Pastry',
        },
      ]);
    }
    setErrors({});
  }, [initialEvent, isOpen]);

  if (!isOpen) return null;

  // Add Item to Menu Plan
  const handleAddMenuItem = () => {
    const defaultHeadcount = guaranteedHeadcount || expectedGuestCount || 100;
    const newItem: BanquetMenuItem = {
      id: `menu-item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      recipeOrIngredientId: '',
      itemName: 'Chef Special Course Item',
      course: 'ENTREE',
      targetPortions: defaultHeadcount,
      estimatedCostPerPortion: 8.5,
      prepNotes: '',
      stationAssignment: 'Sauce/Sauté',
    };
    setMenuPlan([...menuPlan, newItem]);
  };

  const handleRemoveMenuItem = (id: string) => {
    setMenuPlan(menuPlan.filter((item) => item.id !== id));
  };

  const handleUpdateMenuItem = (id: string, updates: Partial<BanquetMenuItem>) => {
    setMenuPlan(
      menuPlan.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          // If recipe was chosen, populate name & cost
          if (updates.recipeOrIngredientId && updates.recipeOrIngredientId !== item.recipeOrIngredientId) {
            const foundRecipe = recipes.find((r) => r.id === updates.recipeOrIngredientId);
            if (foundRecipe) {
              const portionCost =
                foundRecipe.ingredients.reduce((s, i) => s + i.quantity * i.unitCost, 0) /
                (foundRecipe.standardYieldQuantity || 1);
              updated.itemName = foundRecipe.name;
              updated.estimatedCostPerPortion = Math.round(portionCost * 100) / 100;
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) {
      errs.title = 'Event title is required.';
    }
    if (!startDateTime) {
      errs.startDateTime = 'Start date & time are required.';
    }
    if (!endDateTime) {
      errs.endDateTime = 'End date & time are required.';
    }
    if (new Date(startDateTime).getTime() >= new Date(endDateTime).getTime()) {
      errs.endDateTime = 'End time must be after start time.';
    }
    if (expectedGuestCount < 0) {
      errs.expectedGuestCount = 'Expected guests cannot be negative.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const startTimestamp = new Date(startDateTime).getTime();
    const endTimestamp = new Date(endDateTime).getTime();

    const payload = {
      title: title.trim(),
      category,
      status,
      startTime: startTimestamp,
      endTime: endTimestamp,
      expectedGuestCount: Number(expectedGuestCount) || 0,
      guaranteedHeadcount: Number(guaranteedHeadcount) || Number(expectedGuestCount) || 0,
      location,
      clientName: clientName.trim() || undefined,
      eventNotes: eventNotes.trim() || undefined,
      menuPlan,
      isSyncedToGoogle,
    };

    if (initialEvent) {
      onSave({
        ...initialEvent,
        ...payload,
        updatedTimestamp: Date.now(),
      });
    } else {
      onSave(payload);
    }
    onClose();
  };

  // Compute Total Banquet Menu Valuation
  const totalEstimatedCost = menuPlan.reduce(
    (sum, item) => sum + item.targetPortions * item.estimatedCostPerPortion,
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-900 text-white flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 id="modal-title" className="text-base font-bold text-slate-900">
                {isEditing ? 'Edit Kitchen Event & Banquet Plan' : 'Schedule New Kitchen Event'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing ? `Event ID: ${initialEvent?.id}` : 'Create banquet, buffet, or line special with course breakdown'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* General Details Grid */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-indigo-700" />
              <span>Event Overview & Venue</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Event Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Member-Guest Invitational Gala Dinner"
                  className={`w-full h-11 px-3.5 bg-slate-50 border rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white transition-colors ${
                    errors.title ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-600'
                  }`}
                />
                {errors.title && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as EventCategory)}
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-600 focus:bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Location / Venue
                </label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-600 focus:bg-white"
                >
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Client / Host Name
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Dr. Robert Harrison"
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EventStatus)}
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-600 focus:bg-white"
                >
                  <option value="PLANNED">PLANNED (Upcoming)</option>
                  <option value="IN_PREP">IN_PREP (Kitchen Active)</option>
                  <option value="COMPLETED">COMPLETED (Served)</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>
          </div>

          {/* Schedule & Headcount Block */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-indigo-700" />
              <span>Schedule Timing & Guest Counts</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Start Date & Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
                  className="w-full h-10 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  End Date & Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={endDateTime}
                  onChange={(e) => setEndDateTime(e.target.value)}
                  className="w-full h-10 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:border-indigo-600"
                />
                {errors.endDateTime && (
                  <p className="text-[10px] text-rose-500 mt-1">{errors.endDateTime}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Expected {terminology.guestLabel}s
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={expectedGuestCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setExpectedGuestCount(val);
                      if (!isEditing && (!guaranteedHeadcount || guaranteedHeadcount === expectedGuestCount)) {
                        setGuaranteedHeadcount(val);
                      }
                    }}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-hidden focus:border-indigo-600"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
                    {terminology.guestLabel}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  {terminology.guestPluralLabel}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={guaranteedHeadcount}
                    onChange={(e) => setGuaranteedHeadcount(parseInt(e.target.value) || 0)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-indigo-950 focus:outline-hidden focus:border-indigo-600"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
                    Contract
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Operational & Kitchen Service Notes
              </label>
              <textarea
                value={eventNotes}
                onChange={(e) => setEventNotes(e.target.value)}
                rows={2}
                placeholder="e.g. VIP tables near podium. Plating waves: 340 covers within 25 min. Dietary notes: 8 gluten-free, 4 vegan."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Banquet / Buffet Menu Builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Banquet / Buffet Course Menu Builder</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Attach dishes, portion targets, estimated food costs, and station directives
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddMenuItem}
                className="min-h-[38px] px-3 py-1.5 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Course Item</span>
              </button>
            </div>

            {menuPlan.length === 0 ? (
              <div className="p-6 border border-dashed border-slate-300 rounded-2xl text-center text-slate-400">
                <UtensilsCrossed className="w-7 h-7 mx-auto mb-1.5 text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">No menu items attached yet</p>
                <p className="text-[11px] mt-0.5">
                  Click "Add Course Item" to build the banquet courses and automatically scale kitchen portions.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                {menuPlan.map((item, idx) => (
                  <div key={item.id} className="p-3.5 hover:bg-slate-50/70 transition-colors space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-900 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={item.itemName}
                          onChange={(e) => handleUpdateMenuItem(item.id, { itemName: e.target.value })}
                          placeholder="Dish Name / Description"
                          className="font-bold text-xs text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-600 focus:outline-hidden px-1 py-0.5"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveMenuItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Remove menu item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          Course
                        </label>
                        <select
                          value={item.course}
                          onChange={(e) =>
                            handleUpdateMenuItem(item.id, { course: e.target.value as BanquetCourse })
                          }
                          className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                        >
                          {COURSES.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          Portions
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.targetPortions}
                          onChange={(e) =>
                            handleUpdateMenuItem(item.id, {
                              targetPortions: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          Est. Cost / Portion
                        </label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                            $
                          </span>
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            value={item.estimatedCostPerPortion}
                            onChange={(e) =>
                              handleUpdateMenuItem(item.id, {
                                estimatedCostPerPortion: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full h-8 pl-5 pr-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          Kitchen Station
                        </label>
                        <select
                          value={item.stationAssignment || 'Sauce/Sauté'}
                          onChange={(e) =>
                            handleUpdateMenuItem(item.id, {
                              stationAssignment: e.target.value as any,
                            })
                          }
                          className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                        >
                          {STATIONS.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          Total Course Cost
                        </label>
                        <div className="h-8 flex items-center font-mono font-black text-xs text-slate-900">
                          ${(item.targetPortions * item.estimatedCostPerPortion).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={item.prepNotes || ''}
                        onChange={(e) => handleUpdateMenuItem(item.id, { prepNotes: e.target.value })}
                        placeholder="Station prep directive (e.g. 8 gluten-free portions on Left Plating Station)"
                        className="w-full h-7 px-2 bg-slate-50/60 border border-slate-200 rounded-md text-[11px] text-slate-700 placeholder-slate-400"
                      />
                    </div>
                  </div>
                ))}

                {/* Total Menu Valuation Summary */}
                <div className="p-3 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Attached Banquet Courses: {menuPlan.length}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Combined Food Cost:</span>
                    <span className="font-mono font-black text-slate-900">
                      ${totalEstimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Google Calendar Sync Switch */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Synchronize to Google Calendar
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Automatically syncs event times, venues, headcounts, and banquet menu plans to Google Calendar.
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isSyncedToGoogle}
                onChange={(e) => setIsSyncedToGoogle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-900"></div>
            </label>
          </div>

          {/* Modal Action Footer */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-950/20 transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'Save Event Changes' : 'Schedule Kitchen Event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
