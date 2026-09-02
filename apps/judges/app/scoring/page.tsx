'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card, Button, getApiBaseUrl } from '@srf/ui';

interface Criterion {
  name: string;
  description?: string;
  maxMarks: number;
}

interface AssignedRound {
  id: string;
  name: string;
  day: number;
  maxMarks: number;
  status: string;
  criteria: Criterion[];
}

interface AssignedCategory {
  id: string;
  name: string;
  code: string;
  rounds: AssignedRound[];
}

interface Assignment {
  judge: { id: string; name: string; email: string };
  event: { id: string; name: string; code: string; location?: string };
  assignedCategories: AssignedCategory[];
  category: { id: string; name: string; code: string };
  round: AssignedRound;
}

interface ContestantItem {
  id: string;
  score: {
    id: string;
    subScores: Record<string, number>;
    totalScore: number;
    locked: boolean;
    submittedAt: string;
  } | null;
}

export default function JudgeScoringConsole() {
  const API = getApiBaseUrl();
  const router = useRouter();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const [contestants, setContestants] = useState<ContestantItem[]>([]);
  const [selectedContestantId, setSelectedContestantId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Current evaluation scores form state
  const [scores, setScores] = useState<Record<string, string>>({});
  const [isLocked, setIsLocked] = useState(false);

  // Status & loading states
  const [loading, setLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmLockModal, setConfirmLockModal] = useState(false);

  // Select a contestant and populate existing scores if any
  const selectContestant = (c: ContestantItem) => {
    setSelectedContestantId(c.id);
    setErrorMsg('');
    setSuccessMsg('');

    if (c.score) {
      const formatted: Record<string, string> = {};
      Object.entries(c.score.subScores || {}).forEach(([k, v]) => {
        formatted[k] = String(v);
      });
      setScores(formatted);
      setIsLocked(c.score.locked);
    } else {
      setScores({});
      setIsLocked(false);
    }
  };

  // 1. Load active judge assignment and contestant list
  const loadConsoleData = useCallback(async (catId?: string, rndId?: string) => {
    if (!catId) setLoading(true);
    else setCategoryLoading(true);
    setErrorMsg('');

    try {
      const queryParams = new URLSearchParams();
      if (catId) queryParams.set('categoryId', catId);
      if (rndId) queryParams.set('roundId', rndId);
      const queryStr = queryParams.toString() ? `?${queryParams.toString()}` : '';

      const res = await fetch(`${API}/judge/contestants${queryStr}`, {
        credentials: 'include',
      });

      if (res.status === 401) {
        router.replace('/login');
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Unable to load scoring console.');
      }

      const data = await res.json();
      const assignmentData: Assignment = data.assignment || {
        judge: data.judge,
        event: data.event,
        assignedCategories: data.assignedCategories || [],
        category: data.category,
        round: data.round,
      };

      setAssignment(assignmentData);
      setSelectedCategoryId(assignmentData.category.id);
      setSelectedRoundId(assignmentData.round.id);

      const contestantsList: ContestantItem[] = data.contestants || [];
      setContestants(contestantsList);

      if (contestantsList.length > 0) {
        selectContestant(contestantsList[0]);
      } else {
        setSelectedContestantId('');
        setScores({});
        setIsLocked(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to connect to judging server.');
    } finally {
      setLoading(false);
      setCategoryLoading(false);
    }
  }, [API, router]);

  useEffect(() => {
    loadConsoleData();
  }, [loadConsoleData]);

  // Handle Category Switching
  const handleCategorySwitch = async (newCategoryId: string) => {
    if (newCategoryId === selectedCategoryId || categoryLoading) return;
    const cat = assignment?.assignedCategories.find((c) => c.id === newCategoryId);
    const firstRoundId = cat?.rounds && cat.rounds.length > 0 ? cat.rounds[0].id : undefined;
    await loadConsoleData(newCategoryId, firstRoundId);
  };

  // Handle Round Switching
  const handleRoundSwitch = async (newRoundId: string) => {
    if (newRoundId === selectedRoundId || categoryLoading) return;
    await loadConsoleData(selectedCategoryId, newRoundId);
  };

  const handleScoreChange = (criterionName: string, value: string, maxMarks: number) => {
    if (isLocked) return;
    setSuccessMsg('');
    setErrorMsg('');

    if (value === '') {
      setScores((prev) => ({ ...prev, [criterionName]: '' }));
      return;
    }

    const num = parseFloat(value);
    if (!isNaN(num)) {
      if (num < 0) return;
      if (num > maxMarks) {
        setErrorMsg(`Score for '${criterionName}' cannot exceed maximum of ${maxMarks} points.`);
      }
    }
    setScores((prev) => ({ ...prev, [criterionName]: value }));
  };

  // Calculate live preview total
  const calculateTotal = (): number => {
    let sum = 0;
    Object.values(scores).forEach((val) => {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 0) sum += num;
    });
    return Math.round(sum * 100) / 100;
  };

  // 2. Save Score (Draft or Lock)
  const handleSaveScore = async (lock: boolean) => {
    if (!selectedContestantId || !assignment) return;
    setSaveLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Validate all criteria are filled
      const criteria = assignment.round.criteria;
      const payloadScores: Record<string, number> = {};

      for (const crit of criteria) {
        const val = scores[crit.name];
        if (val === undefined || val === '') {
          throw new Error(`Please enter a score for "${crit.name}".`);
        }
        const num = parseFloat(val);
        if (isNaN(num) || num < 0 || num > crit.maxMarks) {
          throw new Error(`Invalid score for "${crit.name}". Must be between 0 and ${crit.maxMarks}.`);
        }
        payloadScores[crit.name] = num;
      }

      const res = await fetch(`${API}/judge/scoring/${selectedContestantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedCategoryId,
          roundId: selectedRoundId,
          subScores: payloadScores,
          lock,
        }),
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to submit score.');
      }

      const result = await res.json();
      setIsLocked(result.locked);
      setConfirmLockModal(false);
      setSuccessMsg(
        lock
          ? 'Score locked successfully and submitted!'
          : 'Score draft saved successfully.',
      );

      // Update in contestant list
      setContestants((prev) =>
        prev.map((item) => {
          if (item.id === selectedContestantId) {
            return {
              ...item,
              score: {
                id: result.id,
                subScores: result.subScores,
                totalScore: result.value,
                locked: result.locked,
                submittedAt: result.submittedAt,
              },
            };
          }
          return item;
        }),
      );
    } catch (err: any) {
      setErrorMsg(err.message ? `Unable to save score. (${err.message})` : 'Unable to save score. Try Again.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {}
    router.replace('/login');
  };

  const filteredContestants = contestants.filter((c) =>
    c.id.toLowerCase().includes(searchQuery.toLowerCase().trim()),
  );

  const selectedContestant = contestants.find((c) => c.id === selectedContestantId);

  // Calculate statistics for active category/round
  const scoredCount = contestants.filter((c) => c.score !== null).length;
  const lockedCount = contestants.filter((c) => c.score?.locked).length;

  const currentCategoryRounds =
    assignment?.assignedCategories.find((c) => c.id === selectedCategoryId)?.rounds ||
    (assignment?.round ? [assignment.round] : []);

  return (
    <div className="min-h-screen bg-[#050505] text-luxury-white flex flex-col selection:bg-luxury-gold selection:text-luxury-black-pure">
      {/* 1. Header Bar */}
      <header className="h-16 bg-[#0A0A0A] border-b border-luxury-gray-border/20 px-6 lg:px-12 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="relative h-8 w-8 rounded-full overflow-hidden border border-luxury-gold/30">
            <Image src="/brand/logo-circle.jpg" alt="Siva Rudra" fill className="object-cover" />
          </div>
          <div>
            <span className="font-serif text-sm tracking-luxury text-luxury-gold uppercase block font-light">
              SIVA RUDRA FOUNDATIONS
            </span>
            <span className="font-sans text-[9px] tracking-luxury text-luxury-white/40 uppercase block">
              JUDGE SCORING TERMINAL
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="font-sans text-xs text-luxury-white font-medium">{assignment?.judge.name}</span>
            <span className="font-mono text-[10px] text-luxury-white/40">{assignment?.judge.email}</span>
          </div>
          <button
            onClick={handleLogout}
            className="font-sans text-[10px] tracking-luxury text-luxury-gold hover:text-white uppercase font-bold px-3 py-1.5 border border-luxury-gold/30 hover:border-luxury-gold transition-colors"
          >
            LOGOUT ↗
          </button>
        </div>
      </header>

      {/* 2. Interactive Multi-Category & Round Switcher Header */}
      {assignment && (
        <div className="bg-gradient-to-r from-[#0C0C0C] via-[#111111] to-[#0C0C0C] border-b border-luxury-gold/20 py-4 px-6 lg:px-12 shadow-lg">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Top row: Event Name & Progress */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 bg-luxury-gold/10 border border-luxury-gold/30 text-luxury-gold font-mono text-[10px] font-bold uppercase tracking-widest">
                  EVENT
                </span>
                <span className="font-serif text-base text-luxury-white font-light">
                  {assignment.event.name} ({assignment.event.code})
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span className="font-sans text-[10px] tracking-luxury text-luxury-white/40 uppercase">
                  PROGRESS:
                </span>
                <span className="px-2.5 py-1 bg-[#161616] border border-luxury-gray-border/40 font-mono text-luxury-gold font-bold text-xs">
                  {scoredCount}/{contestants.length} SCORED ({lockedCount} LOCKED)
                </span>
                <span className="px-2.5 py-1 bg-luxury-gold/15 border border-luxury-gold/40 font-mono text-luxury-gold font-bold text-xs">
                  ROUND MAX: {assignment.round.maxMarks} PTS
                </span>
              </div>
            </div>

            {/* Category Selector Tabs */}
            <div className="pt-2 border-t border-luxury-gray-border/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="font-sans text-[9px] tracking-luxury text-luxury-gold uppercase font-bold mr-2 whitespace-nowrap">
                  CATEGORY:
                </span>
                {assignment.assignedCategories.map((cat) => {
                  const isCatSelected = cat.id === selectedCategoryId;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySwitch(cat.id)}
                      disabled={categoryLoading}
                      className={`px-3.5 py-1.5 text-xs font-medium font-sans tracking-wide transition-all uppercase whitespace-nowrap flex items-center gap-2 ${
                        isCatSelected
                          ? 'bg-luxury-gold text-luxury-black-pure font-bold shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                          : 'bg-[#181818] text-luxury-white/70 border border-luxury-gray-border/30 hover:border-luxury-gold/50 hover:text-white'
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span className={`font-mono text-[10px] px-1 py-0.2 rounded ${isCatSelected ? 'bg-black/20 text-black' : 'bg-black/40 text-luxury-white/50'}`}>
                        {cat.code}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Round Selector Tabs (e.g. Traditional vs Western) */}
              {currentCategoryRounds.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="font-sans text-[9px] tracking-luxury text-luxury-white/40 uppercase font-bold mr-2 whitespace-nowrap">
                    ROUND:
                  </span>
                  {currentCategoryRounds.map((rnd) => {
                    const isRndSelected = rnd.id === selectedRoundId;
                    return (
                      <button
                        key={rnd.id}
                        onClick={() => handleRoundSwitch(rnd.id)}
                        disabled={categoryLoading}
                        className={`px-3 py-1 text-xs font-medium font-sans transition-all uppercase whitespace-nowrap ${
                          isRndSelected
                            ? 'bg-luxury-white text-black font-bold border border-white'
                            : 'bg-[#181818] text-luxury-white/60 border border-luxury-gray-border/30 hover:border-luxury-white/40 hover:text-white'
                        }`}
                      >
                        {rnd.name} ({rnd.maxMarks} PTS)
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Console Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 lg:p-8">
        {loading || categoryLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-pulse">
            <div className="lg:col-span-4 h-96 bg-[#0A0A0A] border border-luxury-gray-border/20 rounded" />
            <div className="lg:col-span-8 h-96 bg-[#0A0A0A] border border-luxury-gray-border/20 rounded" />
          </div>
        ) : errorMsg && !assignment ? (
          <Card hoverEffect={false} className="bg-[#0A0A0A] border-red-500/30 p-12 text-center space-y-4">
            <span className="font-sans text-xs tracking-luxury text-red-400 uppercase font-bold block">
              ACCESS ERROR
            </span>
            <p className="font-sans text-sm text-luxury-white/70">{errorMsg}</p>
            <Button size="sm" variant="outline" onClick={() => loadConsoleData()}>
              RETRY CONNECTION
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: Blind Contestant List (Contestant ID only) */}
            <div className="lg:col-span-4 space-y-4">
              <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold">
                    CONTESTANTS ({filteredContestants.length})
                  </span>
                  <span className="font-sans text-[9px] text-luxury-white/40 uppercase">BLIND JUDGING</span>
                </div>
                <input
                  type="text"
                  placeholder="Search Contestant ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 bg-[#050505] border border-luxury-gray-border/20 px-3 font-mono text-xs text-luxury-white placeholder:text-luxury-white/20 outline-none focus:border-luxury-gold/50"
                />
              </Card>

              <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1 select-none">
                {filteredContestants.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-luxury-gray-border/20 p-4">
                    <span className="font-sans text-xs text-luxury-white/30 uppercase tracking-luxury">
                      NO CONTESTANTS FOUND IN {assignment?.category.name}
                    </span>
                  </div>
                ) : (
                  filteredContestants.map((c) => {
                    const isSelected = c.id === selectedContestantId;
                    const isItemLocked = c.score?.locked;
                    const isItemDraft = c.score && !c.score.locked;

                    return (
                      <div
                        key={c.id}
                        onClick={() => selectContestant(c)}
                        className={`p-4 border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-luxury-gold/10 border-luxury-gold shadow-[0_0_15px_rgba(212,175,55,0.1)]'
                            : 'bg-[#0A0A0A] border-luxury-gray-border/20 hover:border-luxury-gold/40'
                        }`}
                      >
                        <div>
                          <span className="font-mono text-sm font-bold text-luxury-white block tracking-wider">
                            {c.id}
                          </span>
                          <span className="font-sans text-[9px] text-luxury-white/40 uppercase tracking-luxury">
                            {assignment?.category.name} • {assignment?.round.name}
                          </span>
                        </div>

                        <div>
                          {isItemLocked ? (
                            <span className="font-sans text-[9px] tracking-luxury uppercase font-bold text-green-400 border border-green-500/30 px-2 py-0.5 bg-green-500/5">
                              LOCKED ({c.score?.totalScore} pts)
                            </span>
                          ) : isItemDraft ? (
                            <span className="font-sans text-[9px] tracking-luxury uppercase font-bold text-yellow-500 border border-yellow-500/30 px-2 py-0.5 bg-yellow-500/5">
                              DRAFT ({c.score?.totalScore} pts)
                            </span>
                          ) : (
                            <span className="font-sans text-[9px] tracking-luxury uppercase text-luxury-white/30 border border-luxury-gray-border/20 px-2 py-0.5">
                              UNSCORED
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Scoring Interface */}
            <div className="lg:col-span-8 space-y-6">
              {selectedContestant ? (
                <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 sm:p-8 space-y-6">
                  {/* Top Bar of Scoring Card */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-6 border-b border-luxury-gray-border/10 gap-4">
                    <div>
                      <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold block">
                        EVALUATING CONTESTANT
                      </span>
                      <h3 className="font-mono text-2xl font-bold text-luxury-white tracking-wide mt-0.5">
                        {selectedContestant.id}
                      </h3>
                      <span className="font-sans text-xs text-luxury-white/50">
                        {assignment?.category.name} • {assignment?.round.name} (Max {assignment?.round.maxMarks} Points)
                      </span>
                    </div>

                    <div>
                      {isLocked ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400">
                          <span className="text-sm">🔒</span>
                          <span className="font-sans text-[10px] tracking-luxury uppercase font-bold">
                            SCORE LOCKED
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500">
                          <span className="font-sans text-[10px] tracking-luxury uppercase font-bold">
                            EDITABLE MODE
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Feedback alerts */}
                  {errorMsg && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30">
                      <p className="font-sans text-xs text-red-400">{errorMsg}</p>
                    </div>
                  )}
                  {successMsg && (
                    <div className="p-3 bg-luxury-gold/10 border border-luxury-gold/30">
                      <p className="font-sans text-xs text-luxury-gold font-bold">{successMsg}</p>
                    </div>
                  )}

                  {/* Criteria Inputs Grid */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold">
                        EVALUATION CRITERIA
                      </span>
                      <span className="font-sans text-[10px] tracking-luxury text-luxury-white/40 uppercase">
                        MARKS ALLOCATION
                      </span>
                    </div>

                    <div className="space-y-3">
                      {assignment?.round.criteria.map((crit) => {
                        const currentVal = scores[crit.name] || '';

                        return (
                          <div
                            key={crit.name}
                            className="p-4 bg-[#050505] border border-luxury-gray-border/20 flex flex-col sm:flex-row justify-between sm:items-center gap-4 group focus-within:border-luxury-gold/50 transition-colors"
                          >
                            <div className="space-y-0.5">
                              <span className="font-sans text-sm text-luxury-white font-medium block">
                                {crit.name}
                              </span>
                              {crit.description && (
                                <span className="font-sans text-xs text-luxury-white/40 block">
                                  {crit.description}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 justify-end">
                              <input
                                type="number"
                                inputMode="decimal"
                                step="0.25"
                                min="0"
                                max={crit.maxMarks}
                                disabled={isLocked || saveLoading}
                                value={currentVal}
                                onChange={(e) => handleScoreChange(crit.name, e.target.value, crit.maxMarks)}
                                placeholder="0.00"
                                className="w-24 min-h-[44px] h-11 bg-[#000000] border border-luxury-gray-border/40 focus:border-luxury-gold text-center font-mono text-base font-bold text-luxury-gold outline-none transition-colors disabled:opacity-50"
                              />
                              <span className="font-sans text-xs text-luxury-white/40 font-mono min-w-[50px]">
                                / {crit.maxMarks}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Total Calculation Display */}
                  <div className="p-6 bg-[#000000] border border-luxury-gold/30 flex justify-between items-center">
                    <div>
                      <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold block">
                        TOTAL CALCULATED SCORE
                      </span>
                      <span className="font-sans text-xs text-luxury-white/40">
                        Sum of all criterion marks
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-3xl font-bold text-luxury-gold">
                        {calculateTotal().toFixed(2)}
                      </span>
                      <span className="font-mono text-sm text-luxury-white/40 ml-2">
                        / {assignment?.round.maxMarks} PTS
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {!isLocked ? (
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-4">
                      <Button
                        variant="outline"
                        size="md"
                        disabled={saveLoading}
                        onClick={() => handleSaveScore(false)}
                        className="w-full sm:w-auto"
                      >
                        {saveLoading ? 'SAVING DRAFT...' : 'SAVE DRAFT'}
                      </Button>

                      <Button
                        size="md"
                        disabled={saveLoading}
                        onClick={() => setConfirmLockModal(true)}
                        className="w-full sm:w-auto"
                      >
                        SUBMIT FINAL SCORE ↗
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 bg-green-500/5 border border-green-500/20 text-center space-y-1">
                      <p className="font-sans text-xs font-bold text-green-400 tracking-luxury uppercase">
                        🔒 Score Locked
                      </p>
                      <p className="font-sans text-[11px] text-luxury-white/60">
                        This score is locked and cannot be edited unless an Admin unlocks it.
                      </p>
                    </div>
                  )}
                </Card>
              ) : (
                <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-16 text-center">
                  <span className="font-sans text-xs tracking-luxury text-luxury-white/30 uppercase">
                    SELECT A CONTESTANT FROM THE LIST TO BEGIN SCORING
                  </span>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Modal for Final Lock */}
      {confirmLockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-luxury-gold/40 w-full max-w-md p-8 space-y-6 shadow-2xl">
            <h3 className="font-serif text-xl font-light text-luxury-white tracking-wide">
              FINAL SUBMISSION
            </h3>
            <div className="p-4 bg-black border border-luxury-gray-border/20 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-luxury-white/50 uppercase">Contestant</span>
                <span className="font-mono text-luxury-gold font-bold">{selectedContestantId}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-luxury-white/50 uppercase">Category & Round</span>
                <span className="font-sans text-luxury-white font-medium">
                  {assignment?.category.name} • {assignment?.round.name}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-luxury-white/50 uppercase">Final Total</span>
                <span className="font-mono text-luxury-white font-bold">{calculateTotal().toFixed(2)} Points</span>
              </div>
            </div>
            <p className="font-sans text-xs text-yellow-500/90 leading-relaxed">
              ⚠️ Warning: This score is locked and cannot be edited unless an Admin unlocks it.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="text"
                disabled={saveLoading}
                onClick={() => setConfirmLockModal(false)}
              >
                CANCEL
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={saveLoading}
                onClick={() => handleSaveScore(true)}
              >
                {saveLoading ? 'LOCKING SCORE...' : 'CONFIRM & LOCK'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
