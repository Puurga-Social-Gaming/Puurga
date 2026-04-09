// Quick script to add content column to statuses table
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function addContentColumn() {
  console.log('Checking statuses table columns...');
  
  // Try inserting a dummy record with content to see if column exists
  const { error: testError } = await supabase
    .from('statuses')
    .select('content')
    .limit(1);
  
  if (testError) {
    console.log('Content column test result:', testError.message);
    if (testError.message.includes('content') || testError.code === '42703') {
      console.log('❌ Content column does NOT exist.');
      console.log('');
      console.log('You need to run this SQL in your Supabase Dashboard SQL Editor:');
      console.log('');
      console.log('  ALTER TABLE public.statuses ADD COLUMN IF NOT EXISTS content TEXT;');
      console.log('');
      console.log('Go to: https://supabase.com/dashboard → SQL Editor → New Query');
    } else {
      console.log('Some other error:', testError);
    }
  } else {
    console.log('✅ Content column already exists!');
  }

  // Also check expires_at
  const { error: expiresTest } = await supabase
    .from('statuses')
    .select('expires_at')
    .limit(1);
  
  if (expiresTest) {
    console.log('❌ expires_at column does NOT exist.');
    console.log('');
    console.log('Also run:');
    console.log('  ALTER TABLE public.statuses ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;');
  } else {
    console.log('✅ expires_at column exists!');
  }

  // Check type column
  const { error: typeTest } = await supabase
    .from('statuses')
    .select('type')
    .limit(1);
  
  if (typeTest) {
    console.log('❌ type column issue:', typeTest.message);
  } else {
    console.log('✅ type column exists!');
  }

  // Show actual data
  const { data, error } = await supabase
    .from('statuses')
    .select('*')
    .limit(3);
  
  if (error) {
    console.log('Error reading statuses:', error.message);
  } else {
    console.log('\nSample statuses data:', JSON.stringify(data, null, 2));
    if (data && data.length > 0) {
      console.log('\nColumns found:', Object.keys(data[0]));
    } else {
      console.log('\nNo statuses found in table');
    }
  }
}

addContentColumn().catch(console.error);
