import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

console.log("Supabase URL:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testUser() {
  const email = `testuser_${Date.now()}@example.com`;
  const password = "password1234";

  console.log("1. Creating user via admin.createUser...");
  const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: "test_auto", full_name: "Test Auto" }
  });

  if (createError) {
    console.error("Create User Error:", createError.message);
    return;
  }
  
  console.log("User created successfully. ID:", createData.user.id);
  
  console.log("2. Attempting to sign in with password...");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (signInError) {
    console.error("Sign In Error:", signInError.message);
  } else {
    console.log("Sign In Success! Token:", !!signInData.session.access_token);
  }
  
  console.log("3. Cleaning up user...");
  await supabaseAdmin.auth.admin.deleteUser(createData.user.id);
  console.log("User clean up complete.");
}

testUser();
