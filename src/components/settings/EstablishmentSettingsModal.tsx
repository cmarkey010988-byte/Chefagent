import React, { useState } from 'react';
import { useChef } from '../../context/ChefContext';
import { EstablishmentType } from '../../types/establishment';
import {
  ARCHETYPE_METADATA,
  TERMINOLOGY_DICTIONARIES,
} from '../../utils/terminologyMapper';
import {
  X,
  Building2,
  Check,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  MapPin,
  Tag,
  DollarSign,
  Layers,
  UtensilsCrossed,
  ShieldAlert,
} from 'lucide-react';

export const EstablishmentSettingsModal: React.FC = () => {
  const {
    establishmentProfile,
    terminology,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    setEstablishmentType,
    updateEstablishmentProfile,
    addStorageLocation,
    deleteStorageLocation,
    resetStorageLocationsToDefault,
  } = useChef();

  const [activeTab, setActiveTab] = useState<'ARCHETYPE' | 'ZONES' | 'TERMINOLOGY'>('ARCHETYPE');
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneIsNonFood, setNewZoneIsNonFood] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  if (!isSettingsModalOpen) return null;

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSelectArchetype = (type: EstablishmentType) => {
    setEstablishmentType(type, true);
    showNotification(`Switched archetype to ${ARCHETYPE_METADATA[type].shortBadge}`);
  };

  const handleAddZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName.trim()) return;
    addStorageLocation(newZoneName.trim(), newZoneIsNonFood);
    setNewZoneName('');
    showNotification(`Added storage zone "${newZoneName.trim()}"`);
  };

  const foodLocations = establishmentProfile.primaryLocations.filter((l) => !l.isNonFoodZone);
  const nonFoodLocations = establishmentProfile.primaryLocations.filter((l) => l.isNonFoodZone);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-display tracking-tight text-white">
                  Establishment Profile & Terminology Engine
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  Offline-First Room Sync
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Configure your venue archetype, customize food & non-food storage locations, and adapt terminology.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSettingsModalOpen(false)}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ARCHETYPE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 min-h-[44px] ${
              activeTab === 'ARCHETYPE'
                ? 'bg-indigo-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Venue Archetype & Name</span>
          </button>
          <button
            onClick={() => setActiveTab('ZONES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 min-h-[44px] ${
              activeTab === 'ZONES'
                ? 'bg-indigo-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Storage Zones ({establishmentProfile.primaryLocations.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('TERMINOLOGY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 min-h-[44px] ${
              activeTab === 'TERMINOLOGY'
                ? 'bg-indigo-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Dynamic Terminology Matrix</span>
          </button>

          {notification && (
            <div className="ml-auto text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg animate-in fade-in">
              ✓ {notification}
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'ARCHETYPE' && (
            <div className="space-y-6">
              {/* Venue Name & Currency Input */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Venue Branding & Currency
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Establishment / Venue Name
                    </label>
                    <input
                      type="text"
                      value={establishmentProfile.name}
                      onChange={(e) => updateEstablishmentProfile({ name: e.target.value })}
                      placeholder="e.g. Waverley Country Club, L’Auberge Étoile"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Currency Symbol
                    </label>
                    <select
                      value={establishmentProfile.currencySymbol}
                      onChange={(e) => updateEstablishmentProfile({ currencySymbol: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    >
                      <option value="$">$ (USD / CAD / AUD)</option>
                      <option value="€">€ (EUR)</option>
                      <option value="£">£ (GBP)</option>
                      <option value="¥">¥ (JPY / CNY)</option>
                      <option value="CHF">CHF (Swiss Franc)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Archetype Selector Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                    Select Restaurant Archetype
                  </h3>
                  <span className="text-xs text-slate-500">
                    Auto-calibrates guest labels, event workflows, and storage zones
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {(Object.keys(ARCHETYPE_METADATA) as EstablishmentType[]).map((type) => {
                    const meta = ARCHETYPE_METADATA[type];
                    const dict = TERMINOLOGY_DICTIONARIES[type];
                    const isSelected = establishmentProfile.type === type;

                    return (
                      <div
                        key={type}
                        onClick={() => handleSelectArchetype(type)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between min-h-[160px] ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-600 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-indigo-900 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-2xl">{meta.icon}</span>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">{meta.shortBadge}</h4>
                              <span className="text-[10px] font-mono uppercase text-slate-500">{type}</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                            {meta.description}
                          </p>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5 text-[10px] font-mono">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            Guest: <strong>{dict.guestLabel}</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            Event: <strong>{dict.eventLabel.split('/')[0].trim()}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ZONES' && (
            <div className="space-y-6">
              {/* Top Controls: Add Zone & Reset */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                      Add Custom Storage Location
                    </h3>
                    <p className="text-xs text-slate-500">
                      Locations will appear dynamically in inventory audit filters and item creation dialogs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Reset all storage zones back to the default configuration for this archetype?')) {
                        resetStorageLocationsToDefault();
                        showNotification('Reset storage locations to archetype defaults.');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-200/70 transition-colors self-start sm:self-auto min-h-[40px]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset to Archetype Defaults</span>
                  </button>
                </div>

                <form onSubmit={handleAddZone} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={newZoneName}
                      onChange={(e) => setNewZoneName(e.target.value)}
                      placeholder="e.g. Meat Locker, Wine Cellar, Keg Room, Linen Closet"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={newZoneIsNonFood}
                        onChange={(e) => setNewZoneIsNonFood(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-900 focus:ring-indigo-500"
                      />
                      <span>Non-Food Zone</span>
                    </label>
                    <button
                      type="submit"
                      disabled={!newZoneName.trim()}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-900 text-white hover:bg-indigo-800 disabled:opacity-50 transition-all min-h-[44px]"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Zone</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Two Column Storage Zone List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Culinary Food Zones */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                        <UtensilsCrossed className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
                        Culinary & Food Zones ({foodLocations.length})
                      </h4>
                    </div>
                    <span className="text-[10px] text-slate-400">Included in menu generation</span>
                  </div>

                  <div className="space-y-2">
                    {foodLocations.map((loc) => (
                      <div
                        key={loc.id}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/60 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-sm font-bold text-slate-800">{loc.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            deleteStorageLocation(loc.id);
                            showNotification(`Removed zone "${loc.name}"`);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title="Delete Zone"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {foodLocations.length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-400">
                        No culinary food zones defined. Add one above.
                      </div>
                    )}
                  </div>
                </div>

                {/* Non-Food Operational Zones */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
                        Non-Food & Facilities Zones ({nonFoodLocations.length})
                      </h4>
                    </div>
                    <span className="text-[10px] text-slate-400">Chemicals, paper & wares</span>
                  </div>

                  <div className="space-y-2">
                    {nonFoodLocations.map((loc) => (
                      <div
                        key={loc.id}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/60 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-600" />
                          <span className="text-sm font-bold text-slate-800">{loc.name}</span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                            Non-Food
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            deleteStorageLocation(loc.id);
                            showNotification(`Removed zone "${loc.name}"`);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title="Delete Zone"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {nonFoodLocations.length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-400">
                        No non-food operational zones defined.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'TERMINOLOGY' && (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                    Active Terminology for {ARCHETYPE_METADATA[establishmentProfile.type].shortBadge}
                  </h3>
                </div>
                <p className="text-xs text-slate-600">
                  ChefAgent dynamically adjusts all user-facing labels across the kitchen display, prep tickets, event timeline, and reports to reflect your venue archetype.
                </p>
              </div>

              {/* Terminology mapping breakdown grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                  <span className="text-[11px] font-mono text-slate-400 uppercase">Single Guest Term</span>
                  <div className="text-lg font-bold text-indigo-950 font-display">{terminology.guestLabel}</div>
                  <p className="text-xs text-slate-500">e.g. "Per {terminology.guestLabel} Cost", "Expected {terminology.guestLabel}"</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                  <span className="text-[11px] font-mono text-slate-400 uppercase">Plural / Guaranteed Headcount</span>
                  <div className="text-lg font-bold text-indigo-950 font-display">{terminology.guestPluralLabel}</div>
                  <p className="text-xs text-slate-500">Displayed on banquet contracts, table counts, and seating sheets.</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                  <span className="text-[11px] font-mono text-slate-400 uppercase">Event / Service Type</span>
                  <div className="text-lg font-bold text-indigo-950 font-display">{terminology.eventLabel}</div>
                  <p className="text-xs text-slate-500">Replaces generic "Event" across schedules and calendar sync cards.</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                  <span className="text-[11px] font-mono text-slate-400 uppercase">Event Plural Category</span>
                  <div className="text-lg font-bold text-indigo-950 font-display">{terminology.eventPluralLabel}</div>
                  <p className="text-xs text-slate-500">Used for navigation tabs, filters, and high-level summaries.</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                  <span className="text-[11px] font-mono text-slate-400 uppercase">BOH Prep Card Title</span>
                  <div className="text-lg font-bold text-indigo-950 font-display">{terminology.prepCardTitle}</div>
                  <p className="text-xs text-slate-500">Header for line stations and mise en place task boards.</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                  <span className="text-[11px] font-mono text-slate-400 uppercase">Financial Contract Label</span>
                  <div className="text-lg font-bold text-indigo-950 font-display">{terminology.contractValueLabel}</div>
                  <p className="text-xs text-slate-500">Metric header for private bookings and banquet contract totals.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Active: <strong>{establishmentProfile.name}</strong> ({ARCHETYPE_METADATA[establishmentProfile.type].shortBadge})</span>
          </div>
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(false)}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-900 text-white hover:bg-indigo-800 transition-all min-h-[44px]"
          >
            Done & Return
          </button>
        </div>
      </div>
    </div>
  );
};
