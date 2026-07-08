-- 004_replica_identity_full: Set REPLICA IDENTITY FULL on daily_completions
-- so that Realtime DELETE events include all columns (including profile_id)
-- for proper filter matching in postgres_changes subscriptions.
--
-- Without this, DELETE events only carry the PK (task_id, date) in payload.old,
-- so the Realtime filter "profile_id=eq.${profileId}" cannot match and the
-- event is silently dropped. Desktop clients would never learn about un-completions.
ALTER TABLE daily_completions REPLICA IDENTITY FULL;
