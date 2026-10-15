-- Adds the revocation anchor used by JwtAuthFilter: tokens issued before
-- password_changed_at are rejected, so changing a password ends every
-- session started with the old one.
--
-- Nullable on purpose. Existing admins have no recorded change time, which
-- JwtAuthFilter treats as "never changed", so no one is signed out by this
-- migration alone.
ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP NULL;