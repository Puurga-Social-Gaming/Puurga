import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://vhvxfnxtyrgiydztsonz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

const checkSupabaseGroups = async () => {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔍 Checking Supabase group tables...');

    // Try to query groups table
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('*')
      .limit(1);

    if (groupsError) {
      console.log('❌ Groups table not accessible:', groupsError.message);
    } else {
      console.log('✅ Groups table accessible');
      console.log('Sample data:', groups);
    }

    // Try to query group_members table
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('*')
      .limit(1);

    if (membersError) {
      console.log('❌ Group_members table not accessible:', membersError.message);
    } else {
      console.log('✅ Group_members table accessible');
      console.log('Sample data:', members);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkSupabaseGroups();