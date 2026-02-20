# BreviAI Environment and Security Setup

## 1) Backend

1. Copy `backend/.env.example` to `backend/.env`.
2. Set strong secrets:
`APP_SECRET`: client -> backend auth header (`x-app-secret`)
`ADMIN_KEY`: admin-only endpoints auth header (`x-admin-key`)
3. Set CORS allowlist:
`CORS_ALLOWED_ORIGINS`: comma-separated trusted origins
4. Keep development bypass disabled in production:
`ALLOW_INSECURE_DEV_AUTH=false`

## 2) Expo (mobile)

1. Copy `expo/.env.example` to `expo/.env`.
2. Set:
`EXPO_PUBLIC_API_URL`: backend base url
`EXPO_PUBLIC_APP_SECRET`: must match backend `APP_SECRET`

Optional:
`EXPO_PUBLIC_SUPABASE_URL`
`EXPO_PUBLIC_SUPABASE_ANON_KEY`

## 3) Production checklist

1. `APP_SECRET` and `ADMIN_KEY` are unique and random.
2. `ALLOW_INSECURE_DEV_AUTH=false`.
3. `CORS_ALLOWED_ORIGINS` does not include wildcard and only includes trusted domains.
4. Mobile build uses the correct `EXPO_PUBLIC_APP_SECRET`.
