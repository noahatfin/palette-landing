import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const { error } = await supabase
    .from('waitlist')
    .insert({ email: email.trim().toLowerCase() });

  // 23505 = unique_violation，邮箱已存在，静默处理
  if (error && error.code !== '23505') {
    console.error('Supabase error:', error);
    return res.status(500).json({ error: 'Server error' });
  }

  return res.status(200).json({ ok: true });
}
