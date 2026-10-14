#!/bin/bash
# Writes .env.migration (git-ignored) with the NEW Supabase project's
# credentials. Values are typed at a hidden prompt, so they never appear in
# the terminal history, a chat, or any log.
cd "$(dirname "$0")/../.." || exit 1
if [ -f .env.migration ]; then
  read -r -p ".env.migration already exists. Overwrite? [y/N] " ans
  [ "$ans" = "y" ] || { echo "kept the existing file"; exit 0; }
fi
read -r -p "NEW project URL (https://xxxx.supabase.co): " url
read -r -s -p "NEW anon (public) key: " anon; echo
read -r -s -p "NEW service_role key: " svc; echo
{
  echo "NEW_SUPABASE_URL=$url"
  echo "NEW_SUPABASE_ANON_KEY=$anon"
  echo "NEW_SUPABASE_SERVICE_ROLE_KEY=$svc"
} > .env.migration
chmod 600 .env.migration
echo "saved .env.migration"
