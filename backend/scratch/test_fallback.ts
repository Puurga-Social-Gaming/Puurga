import { supabaseAdmin } from '../config/supabase';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function test() {
  console.log('Testing post insertion with fallback...');
  
  const postData: any = {
    user_id: '00000000-0000-0000-0000-000000000000', // Dummy ID
    content: 'Test fallback post',
    visibility: 'public',
    background_color: '#ffffff',
    background_type: 'color'
  };

  let { data, error } = await supabaseAdmin
    .from('posts')
    .insert([postData])
    .select();

  if (error) {
    console.log('Primary insert failed as expected:', error.message, 'Code:', error.code);
    const isMissingColumn = error.code === '42703' || 
                           error.code === 'PGRST204' || 
                           (error.message && error.message.toLowerCase().includes('column') && error.message.toLowerCase().includes('not find'));
    
    if (isMissingColumn) {
      console.log('Attempting fallback insert...');
      const fallbackData = {
        user_id: '00000000-0000-0000-0000-000000000000',
        content: 'Test fallback post (fallback)',
      };
      const fallbackResult = await supabaseAdmin
        .from('posts')
        .insert([fallbackData])
        .select();
      
      if (fallbackResult.error) {
        console.error('Fallback insert failed:', fallbackResult.error.message);
      } else {
        console.log('✅ Fallback insert succeeded!', fallbackResult.data);
      }
    } else {
      console.error('Insert failed with unexpected error:', error);
    }
  } else {
    console.log('✅ Primary insert succeeded unexpectedly (maybe columns exist now?)', data);
  }
}

test();
