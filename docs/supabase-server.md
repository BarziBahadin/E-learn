# Supabase Server SDK Setup

`@supabase/server` is installed for backend or Edge request handlers. Do not import it from the Expo app bundle.

Required backend environment variables:

```bash
SUPABASE_URL=https://duhpxuhncnopspzcuade.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SECRET_KEY=your_secret_key
SUPABASE_JWKS_URL=your_jwks_url
```

Example request handler:

```ts
import { withSupabase } from '@supabase/server';

export default {
  fetch: withSupabase({ auth: 'user' }, async (_req, ctx) => {
    const { data, error } = await ctx.supabase.from('todos').select();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data);
  }),
};
```

For Supabase Edge Functions using non-`user` auth modes, set `verify_jwt = false` for that function in `supabase/config.toml`.
