# Sync setup (Supabase, free)

1. Go to supabase.com, sign up with GitHub, click New project.
   Name: lonewolf-os. Set a database password (save it). Region: closest to Mauritius (e.g. Mumbai or Frankfurt). Free plan.
2. Wait about 2 minutes for the project to start.
3. Left menu: SQL Editor, New query. In LONEWOLF OS go to Rig, open "One-time database setup (SQL)", Copy SQL, paste it into Supabase, click Run. You should see "Success".
4. Left menu: Authentication, Sign In / Providers (or Providers), Email: turn OFF "Confirm email", Save. (Simplest for a personal app.)
5. Left menu: Project Settings, API (or Data API / API Keys). Copy:
   - Project URL (https://xxxx.supabase.co)
   - anon public key (starts with eyJ...)
6. In LONEWOLF OS on the laptop: Rig, Sync. Paste URL and key, type an email and a password, click Create account.
7. On the phone: same URL and key, same email and password, click Sign in.

Syncing happens automatically a few seconds after you study, when you come back online, and when you close the app. "Sync now" forces it.

Notes
- Free Supabase projects pause after about a week with no activity. If sync fails after a break, open supabase.com and click Restore on the project.
- Your Gemini key and Supabase password never sync; enter them on each device.
