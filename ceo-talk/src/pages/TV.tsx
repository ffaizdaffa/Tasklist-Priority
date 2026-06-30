import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SpinWheel from '../components/SpinWheel';
import { useCeoTalkData } from '../hooks/useCeoTalkData';
import { earliestFreeDate, formatDateID, WORKING_DAYS } from '../lib/dates';
import { supabase } from '../lib/supabase';
import { CONFIG } from '../config';
import type { Participant } from '../types';

const SPIN_DURATION = 4.2;

export default function TV() {
  const { participants, schedule, loading, refetchSchedule } = useCeoTalkData();

  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const rotationRef = useRef(0);
  const [snapshot, setSnapshot] = useState<Participant[]>([]);
  const [chosen, setChosen] = useState<Participant | null>(null);
  const [lastResult, setLastResult] = useState<{ name: string; date: string } | null>(null);

  // Map participant_id -> talk_date
  const scheduledMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of schedule) m.set(s.participant_id, s.talk_date);
    return m;
  }, [schedule]);

  const unscheduled = useMemo(
    () => participants.filter((p) => !scheduledMap.has(p.id)),
    [participants, scheduledMap]
  );

  const wheelList = spinning ? snapshot : unscheduled;
  const allDone = participants.length > 0 && unscheduled.length === 0;

  function handleSpin() {
    if (spinning || unscheduled.length === 0) return;

    const list = unscheduled;
    const n = list.length;
    const idx = Math.floor(Math.random() * n);
    const pick = list[idx];

    const seg = 360 / n;
    const center = idx * seg + seg / 2;
    const current = rotationRef.current;
    const currentMod = ((current % 360) + 360) % 360;
    let delta = (360 - center - currentMod) % 360;
    delta = (delta + 360) % 360;
    const final = current + 360 * 6 + delta;

    rotationRef.current = final;
    setSnapshot(list);
    setChosen(pick);
    setLastResult(null);
    setRotation(final);
    setSpinning(true);
  }

  async function assign(participantId: string): Promise<string | null> {
    const used = new Set(schedule.map((s) => s.talk_date));
    for (const d of WORKING_DAYS) {
      if (used.has(d)) continue;
      const { error } = await supabase
        .from('schedule')
        .insert({ participant_id: participantId, talk_date: d });
      if (!error) return d;
      // 23505 = unique_violation (tanggal keburu diambil TV lain / peserta udah ke-assign)
      if (error.code === '23505') {
        used.add(d);
        continue;
      }
      console.error('[CEO Talk] gagal assign jadwal:', error);
      return null;
    }
    return null;
  }

  async function handleSpinComplete() {
    const pick = chosen;
    setSpinning(false);
    if (!pick) return;

    const fallback = earliestFreeDate(schedule.map((s) => s.talk_date));
    if (!fallback) return; // semua tanggal penuh

    const assignedDate = await assign(pick.id);
    if (assignedDate) {
      setLastResult({ name: pick.name, date: assignedDate });
      await refetchSchedule();
    }
    setChosen(null);
  }

  return (
    <div className="min-h-full bg-espresso text-cream p-6 lg:p-10">
      {/* Header */}
      <header className="flex items-center justify-between mb-6 lg:mb-8">
        <div className="flex items-center gap-3">
          <span className="text-5xl">☕</span>
          <div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight">CEO Talk</h1>
            <p className="text-latte/70 text-lg">Ngopi bareng CEO · Batch Jun–Jul 2026</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-5xl lg:text-6xl font-black text-caramel">
            {loading ? '…' : participants.length}
            <span className="text-latte/50 text-3xl">/{CONFIG.MAX_PARTICIPANTS}</span>
          </div>
          <div className="text-latte/70 text-lg">peserta gabung</div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* ===== KIRI: daftar peserta ===== */}
        <section className="bg-espresso/40 rounded-3xl border border-mocha/60 p-5 lg:p-6">
          <h2 className="text-2xl lg:text-3xl font-bold mb-4">Peserta</h2>
          {participants.length === 0 ? (
            <p className="text-latte/60 text-xl py-10 text-center">
              Belum ada yang gabung. Buka <b>/submit</b> di HP buat ikutan ☕
            </p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <AnimatePresence initial={false}>
                {participants.map((p) => {
                  const date = scheduledMap.get(p.id);
                  return (
                    <motion.li
                      key={p.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`flex items-center justify-between rounded-xl px-4 py-3 text-lg
                        ${
                          date
                            ? 'bg-caramel/20 border border-caramel/50'
                            : 'bg-mocha/30 border border-mocha/50'
                        }`}
                    >
                      <span className="flex items-center gap-2.5 font-semibold truncate">
                        <span className="text-latte/50 text-base w-7 shrink-0">
                          #{p.position}
                        </span>
                        <span className="truncate">{p.name}</span>
                      </span>
                      {date ? (
                        <span className="flex items-center gap-1.5 text-caramel font-bold whitespace-nowrap">
                          ✓ {formatDateID(date)}
                        </span>
                      ) : (
                        <span className="text-latte/40 text-sm whitespace-nowrap">
                          belum dijadwal
                        </span>
                      )}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </section>

        {/* ===== KANAN: wheel + jadwal ===== */}
        <section className="bg-espresso/40 rounded-3xl border border-mocha/60 p-5 lg:p-6">
          {allDone ? (
            <div className="text-center py-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-6xl mb-3"
              >
                🔥
              </motion.div>
              <h2 className="text-3xl lg:text-4xl font-black text-caramel">
                Jadwal CEO Talk lengkap!
              </h2>
              <p className="text-latte/70 text-xl mt-1">
                Semua {participants.length} peserta udah kebagian slot.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-center">
                Spin buat ngacak jadwal!
              </h2>

              <SpinWheel
                participants={wheelList}
                rotation={rotation}
                spinning={spinning}
                durationSec={SPIN_DURATION}
                onSpinComplete={handleSpinComplete}
              />

              <button
                onClick={handleSpin}
                disabled={spinning || unscheduled.length === 0}
                className="mt-6 w-full rounded-2xl bg-caramel py-5 text-3xl lg:text-4xl font-black
                           text-espresso shadow-lg transition active:scale-[0.99]
                           disabled:opacity-50 disabled:active:scale-100"
              >
                {spinning ? 'MUTER…' : 'SPIN 🎡'}
              </button>

              <p className="mt-3 text-center text-latte/60 text-lg">
                {unscheduled.length} peserta masih nunggu jadwal
              </p>

              <AnimatePresence>
                {lastResult && (
                  <motion.div
                    key={lastResult.name + lastResult.date}
                    initial={{ opacity: 0, y: 14, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="mt-5 rounded-2xl bg-caramel/20 border border-caramel/50 p-4 text-center"
                  >
                    <span className="text-2xl lg:text-3xl font-black">
                      🎉 {lastResult.name}
                    </span>
                    <span className="text-latte/80 text-xl lg:text-2xl">
                      {' '}
                      → {formatDateID(lastResult.date)}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* Grid jadwal kebangun */}
          <div className="mt-7">
            <h3 className="text-xl lg:text-2xl font-bold mb-3">
              Jadwal terbentuk ({schedule.length}/{WORKING_DAYS.length})
            </h3>
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
              {WORKING_DAYS.map((d) => {
                const row = schedule.find((s) => s.talk_date === d);
                const person = row
                  ? participants.find((p) => p.id === row.participant_id)
                  : null;
                return (
                  <div
                    key={d}
                    className={`rounded-xl px-3 py-2.5 border ${
                      person
                        ? 'bg-caramel/15 border-caramel/40'
                        : 'bg-mocha/20 border-mocha/40 border-dashed'
                    }`}
                  >
                    <div className="text-sm text-latte/60">{formatDateID(d)}</div>
                    <div
                      className={`text-lg font-bold truncate ${
                        person ? 'text-cream' : 'text-latte/30'
                      }`}
                    >
                      {person ? person.name : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
