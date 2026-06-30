import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Participant, ScheduleRow } from '../types';

/**
 * Subscribe real-time ke table participants & schedule.
 * Tiap ada perubahan (insert/update/delete) kita refetch table terkait —
 * dataset-nya kecil (maks 24 baris) jadi refetch jauh lebih simpel & anti-bug
 * dibanding nge-merge event satu-satu.
 */
export function useCeoTalkData() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refetchParticipants = useCallback(async () => {
    const { data } = await supabase
      .from('participants')
      .select('*')
      .order('position', { ascending: true });
    if (data) setParticipants(data as Participant[]);
  }, []);

  const refetchSchedule = useCallback(async () => {
    const { data } = await supabase
      .from('schedule')
      .select('*')
      .order('talk_date', { ascending: true });
    if (data) setSchedule(data as ScheduleRow[]);
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      await Promise.all([refetchParticipants(), refetchSchedule()]);
      if (active) setLoading(false);
    })();

    const channel = supabase
      .channel('ceo-talk-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants' },
        () => refetchParticipants()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedule' },
        () => refetchSchedule()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [refetchParticipants, refetchSchedule]);

  return { participants, schedule, loading, refetchParticipants, refetchSchedule };
}
