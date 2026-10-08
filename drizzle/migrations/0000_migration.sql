-- Remove anonymous direct read access to campaign-images objects.
-- Campaign cover images are now served via server-side signed URLs
-- (getCampaignImageUrls server function using the service role), so
-- anonymous visitors no longer need a storage.objects SELECT policy.
DROP POLICY IF EXISTS camp_img_read_anon ON storage.objects;