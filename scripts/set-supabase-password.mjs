import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readLocalEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  try {
    const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      process.env[key] ??= value;
    }
  } catch {
    // .env.local is optional; real secrets should come from the shell.
  }
}

function getArg(name) {
  const flag = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(flag));
  return value?.slice(flag.length);
}

async function findUserByEmail(adminClient, email) {
  let page = 1;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;

    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 100) return null;
    page += 1;
  }
}

readLocalEnv();

const email = getArg('email');
const password = getArg('password');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !password) {
  console.error('Usage: npm run auth:set-password -- --email=you@example.com --password=YourPassword');
  process.exit(1);
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Set SUPABASE_SERVICE_ROLE_KEY only in this terminal. Do not put it in Vite client env vars.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const existingUser = await findUserByEmail(supabaseAdmin, email);

if (existingUser) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
    password,
    email_confirm: true,
  });
  if (error) throw error;
  console.log(`Updated password for ${email}`);
} else {
  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  console.log(`Created user and password for ${email}`);
}
