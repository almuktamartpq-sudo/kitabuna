-- scripts/update-offline-devices-columns.sql
-- Add device_type and device_model to offline_devices

ALTER TABLE public.offline_devices
  ADD COLUMN IF NOT EXISTS device_type text;

ALTER TABLE public.offline_devices
  ADD COLUMN IF NOT EXISTS device_model text;

-- If you want new records to default to an empty string instead of NULL:
ALTER TABLE public.offline_devices
  ALTER COLUMN device_type SET DEFAULT NULL;

ALTER TABLE public.offline_devices
  ALTER COLUMN device_model SET DEFAULT NULL;

-- Ensure your trigger `update_offline_devices_updated_at` already exists in the database
-- If it does not, create it separately using your existing trigger function.
