import {handleApi} from '../worker/api.mjs';

// This entry point runs only on Vercel. The browser never receives these values.
export default {
  fetch(request) {
    return handleApi(request, {
      STORAGE_BACKEND: 'supabase',
      TEAM_EDIT_CODE: process.env.TEAM_EDIT_CODE,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    });
  },
};
