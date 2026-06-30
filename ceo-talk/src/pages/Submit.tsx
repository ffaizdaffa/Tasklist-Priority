import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useCeoTalkData } from '../hooks/useCeoTalkData';
import { CONFIG } from '../config';
import type { Participant } from '../types';

const DEVICE_KEY = 'ceo-talk:joined';

type JoinedInfo = { name: string; position: number };

function loadJoined(): JoinedInfo | null {
  try {
    const raw = localStorage.getItem(DEVICE_KEY);
    return raw ? (JSON.parse(raw) as JoinedInfo) : null;
  } catch {
    return null;
  }
}

export default function Submit() {
  const { participants, loading } = useCeoTalkData();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState<JoinedInfo | null>(() => loadJoined());

  const count = participants.length;
  const isFull = count >= CONFIG.MAX_PARTICIPANTS;

  // Deteksi duplikat nama (warning aja, gak nge-block).
  const trimmed = name.trim();
  const isDuplicate = useMemo(
    () =>
      trimmed.length > 0 &&
      participants.some((p) => p.name.toLowerCase() === trimmed.toLowerCase()),
    [participants, trimmed]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!trimmed) {
      setError('Isi nama lo dulu ya 🙂');
      return;
    }
    if (joined) return; // udah submit dari device ini
    if (isFull) return;

    setSubmitting(true);
    try {
      // RPC atomic: cek cap + insert dalam 1 transaksi (anti race condition).
      const { data, error: rpcError } = await supabase.rpc('join_ceo_talk', {
        p_name: trimmed,
      });

      if (rpcError) {
        if (rpcError.message.includes('FULL')) {
          setError('Yah, slot baru aja penuh 🙏 Sampai jumpa di batch berikutnya.');
        } else {
          setError('Gagal join, coba lagi sebentar ya 🙏');
          console.error(rpcError);
        }
        return;
      }

      const row = data as Participant;
      const info: JoinedInfo = { name: row.name, position: row.position };
      localStorage.setItem(DEVICE_KEY, JSON.stringify(info));
      setJoined(info);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full flex flex-col items-center px-5 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">☕</div>
          <h1 className="text-3xl font-extrabold text-espresso">CEO Talk</h1>
          <p className="text-mocha/80 mt-1">
            Ngobrol santai bareng CEO sambil ngopi & makan 🍩
          </p>
        </div>

        {/* Counter live */}
        <div className="bg-white rounded-2xl shadow-sm border border-latte p-4 mb-5">
          <div className="flex items-end justify-between mb-2">
            <span className="text-sm font-medium text-mocha">Slot terisi</span>
            <span className="text-sm font-semibold text-mocha">
              {loading ? '…' : count}/{CONFIG.MAX_PARTICIPANTS}
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-latte overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-caramel"
              initial={false}
              animate={{
                width: `${Math.min(100, (count / CONFIG.MAX_PARTICIPANTS) * 100)}%`,
              }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
        </div>

        {/* State: udah join dari device ini */}
        {joined ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-latte p-6 text-center"
          >
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-lg font-bold text-espresso">
              Lo peserta #{joined.position} dari {CONFIG.MAX_PARTICIPANTS}
            </p>
            <p className="text-mocha mt-1">
              Hai <span className="font-semibold">{joined.name}</span>! Tunggu jadwal lo
              muncul di layar TV ya 📺
            </p>
          </motion.div>
        ) : isFull ? (
          /* State: penuh */
          <div className="bg-white rounded-2xl shadow-sm border border-latte p-6 text-center">
            <div className="text-4xl mb-2">🙏</div>
            <p className="text-lg font-bold text-espresso">Slot udah penuh</p>
            <p className="text-mocha mt-1">Sampai jumpa di batch berikutnya 🙏</p>
          </div>
        ) : (
          /* State: form */
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-sm border border-latte p-5"
          >
            <label htmlFor="name" className="block text-sm font-medium text-mocha mb-2">
              Nama lo
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Daffa"
              autoComplete="off"
              maxLength={40}
              className="w-full rounded-xl border border-latte bg-cream/50 px-4 py-3 text-lg
                         text-espresso outline-none focus:border-caramel focus:ring-2
                         focus:ring-caramel/30 transition"
            />

            {isDuplicate && (
              <p className="mt-2 text-sm text-caramel">
                ⚠️ Udah ada nama yang sama. Gak masalah, tapi pastiin ini bener lo ya.
              </p>
            )}
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !trimmed}
              className="mt-4 w-full rounded-xl bg-mocha py-3.5 text-lg font-bold text-cream
                         shadow-sm transition active:scale-[0.99] disabled:opacity-50
                         disabled:active:scale-100"
            >
              {submitting ? 'Mendaftar…' : 'Ikut CEO Talk ☕'}
            </button>

            <p className="mt-3 text-center text-xs text-mocha/60">
              Tinggal {Math.max(0, CONFIG.MAX_PARTICIPANTS - count)} slot lagi
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
