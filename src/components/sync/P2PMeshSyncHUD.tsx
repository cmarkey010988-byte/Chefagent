import React, { useState, useEffect } from 'react';
import {
  Database,
  Wifi,
  WifiOff,
  RefreshCw,
  X,
  Zap,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  ArrowUpRight,
  Trash2,
  Activity,
  Server,
  Network,
} from 'lucide-react';
import { SqliteOutboxRepository, OutboxStats } from '../../services/sync/SqliteOutboxRepository';
import { LocalDatabaseEngine } from '../../services/sync/LocalDatabaseEngine';
import { P2PDeltaSyncEngine, EngineSyncState, SyncConflictAuditEntry } from '../../services/sync/P2PDeltaSyncEngine';

interface P2PMeshSyncHUDProps {
  isOpen: boolean;
  onClose: () => void;
}

export const P2PMeshSyncHUD: React.FC<P2PMeshSyncHUDProps> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<OutboxStats>(SqliteOutboxRepository.getOutboxStats());
  const [syncState, setSyncState] = useState<EngineSyncState>(P2PDeltaSyncEngine.getCurrentState());
  const [isOffline, setIsOffline] = useState<boolean>(P2PDeltaSyncEngine.isOffline());
  const [auditLogs, setAuditLogs] = useState<SyncConflictAuditEntry[]>(P2PDeltaSyncEngine.getConflictAuditLogs());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const refreshData = () => {
      setStats(SqliteOutboxRepository.getOutboxStats());
      setSyncState(P2PDeltaSyncEngine.getCurrentState());
      setIsOffline(P2PDeltaSyncEngine.isOffline());
      setAuditLogs([...P2PDeltaSyncEngine.getConflictAuditLogs()]);
    };

    refreshData();
    const interval = setInterval(refreshData, 1000);

    const unsubscribe = P2PDeltaSyncEngine.subscribeStateChange((newState) => {
      setSyncState(newState);
      refreshData();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSimulateLocalWrite = () => {
    const { outboxRecord } = LocalDatabaseEngine.updateInventoryQuantity(
      'item-prime-beef-101',
      -1.5,
      '0ms Cook Line Tap Adjustment'
    );

    setStats(SqliteOutboxRepository.getOutboxStats());
    setFeedbackMessage(`0ms Local WAL Write Committed! Outbox Seq #${outboxRecord.seqId} [PENDING].`);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleSimulateConflict = () => {
    const { localRecord, conflictResult } = P2PDeltaSyncEngine.simulateSplitBrainConflict();
    setStats(SqliteOutboxRepository.getOutboxStats());
    setAuditLogs([...P2PDeltaSyncEngine.getConflictAuditLogs()]);
    setFeedbackMessage(
      `Split-Brain Vector Clock Conflict resolved via ${conflictResult.strategy}! Winner: ${conflictResult.winner}.`
    );
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    const result = await P2PDeltaSyncEngine.processOutboxDeltaQueue();
    setIsSyncing(false);
    setStats(SqliteOutboxRepository.getOutboxStats());
    setFeedbackMessage(
      `P2P Delta Sync Complete: ${result.processedCount} mutations synced over mesh!`
    );
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleToggleOffline = () => {
    const nowOffline = P2PDeltaSyncEngine.toggleForcedNetworkOffline();
    setIsOffline(nowOffline);
    setSyncState(P2PDeltaSyncEngine.getCurrentState());
    setFeedbackMessage(nowOffline ? 'Commercial Kitchen Network Isolated (Offline Mode).' : 'Kitchen Mesh Restored (Online Mode).');
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handlePurgeSynced = () => {
    const purged = SqliteOutboxRepository.purgeSyncedMutations();
    setStats(SqliteOutboxRepository.getOutboxStats());
    setFeedbackMessage(`Purged ${purged} synced records from outbox queue.`);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const meshNodes = P2PDeltaSyncEngine.getMeshNodes();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-tight">
                  Local-First SQLite WAL & P2P Delta-Sync Engine
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  PRAGMA WAL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                0ms Zero-Latency Client Storage · Append-Only Outbox · Vector Clock LWW Resolver
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert Banner */}
        {feedbackMessage && (
          <div className="bg-amber-500/20 border-b border-amber-500/30 px-6 py-2.5 flex items-center gap-2 text-xs font-mono text-amber-300 animate-in slide-in-from-top-2">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Status Indicators Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Storage Layer Mode */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>SQLite Journal</span>
              </div>
              <div className="text-lg font-black font-mono text-white flex items-center gap-2">
                <span>{stats.journalMode}</span>
                <span className="text-xs text-amber-400 font-normal">({stats.synchronousMode})</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Non-blocking concurrent reads</div>
            </div>

            {/* Network State */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                {isOffline ? <WifiOff className="w-3.5 h-3.5 text-rose-400" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
                <span>Mesh Network</span>
              </div>
              <div
                className={`text-lg font-black font-mono ${
                  isOffline ? 'text-rose-400' : syncState === 'SYNCING' ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {isOffline ? 'OFFLINE' : syncState}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Node ID: {stats.nodeId}</div>
            </div>

            {/* Outbox Pending Mutations */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>Outbox Queue</span>
              </div>
              <div className="text-lg font-black font-mono text-sky-300 flex items-center gap-2">
                <span>{stats.pendingCount} PENDING</span>
                <span className="text-xs text-slate-400">/ {stats.totalMutations} total</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Max Seq ID: #{stats.maxSeqId}</div>
            </div>

            {/* Conflict Resolution Count */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Resolved Conflicts</span>
              </div>
              <div className="text-lg font-black font-mono text-amber-300">
                {auditLogs.length} LOGGED
              </div>
              <div className="text-[10px] text-slate-500 mt-1">LWW + Vector Clocks</div>
            </div>
          </div>

          {/* Interactive Simulation Controls */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>Interactive Local-First Simulation Controls</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <button
                onClick={handleSimulateLocalWrite}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span>Simulate 0ms Local Write</span>
              </button>

              <button
                onClick={handleToggleOffline}
                className={`px-4 py-2.5 font-extrabold text-xs rounded-xl transition-all border flex items-center justify-center gap-2 ${
                  isOffline
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                    : 'bg-rose-950/60 hover:bg-rose-900 text-rose-200 border-rose-800'
                }`}
              >
                {isOffline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                <span>{isOffline ? 'Restore Network' : 'Cut Network (Offline)'}</span>
              </button>

              <button
                onClick={handleSimulateConflict}
                className="px-4 py-2.5 bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 font-extrabold text-xs rounded-xl border border-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Simulate Split-Brain</span>
              </button>

              <button
                onClick={handleForceSync}
                disabled={isSyncing || isOffline}
                className="px-4 py-2.5 bg-sky-950/80 hover:bg-sky-900 disabled:opacity-50 text-sky-200 font-extrabold text-xs rounded-xl border border-sky-800 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 text-sky-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Force Mesh Delta Sync</span>
              </button>
            </div>
          </div>

          {/* P2P Mesh Cluster Graph */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-2">
                <Network className="w-4 h-4 text-amber-400" />
                <span>Local Commercial Kitchen P2P Mesh Cluster</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">3 Active Local Peers</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {meshNodes.map((node) => (
                <div
                  key={node.nodeId}
                  className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        node.isLeader ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{node.nodeName}</span>
                        {node.isLeader && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded font-mono font-bold">
                            LEADER
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">{node.ipAddress}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-emerald-400">{node.latencyMs}ms</div>
                    <div className="text-[9px] font-mono text-slate-500">Seq #{node.syncSequence}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Vector Clock LWW Conflict Resolution Audit Stream */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <span>Deterministic Conflict Audit Stream (Vector Clocks + LWW)</span>
              </h3>
              <button
                onClick={handlePurgeSynced}
                className="text-[11px] font-mono text-slate-400 hover:text-rose-300 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Purge Synced Outbox</span>
              </button>
            </div>

            {auditLogs.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-xl">
                No split-brain conflict entries logged. Click "Simulate Split-Brain" above to test LWW resolution.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-slate-900 border border-amber-500/20 rounded-xl p-3 text-xs font-mono space-y-1"
                  >
                    <div className="flex items-center justify-between text-amber-300">
                      <span className="font-bold">
                        Seq #{log.seqId} · Entity: {log.entityId} ({log.tableName})
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 font-bold">
                        {log.resolutionStrategy}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Local Clock: {JSON.stringify(log.localVectorClock)}</span>
                      <span>Remote Clock: {JSON.stringify(log.remoteVectorClock)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="font-mono">PRAGMA synchronous = NORMAL · PRAGMA busy_timeout = 5000</div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors text-xs"
          >
            Close HUD
          </button>
        </div>
      </div>
    </div>
  );
};
