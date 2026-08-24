import sequelize from '../config/database';
import { createClient } from '@supabase/supabase-js';

// Local database connection
const checkLocalTables = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to local PostgreSQL');

    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\n📊 Local Database Tables:');
    console.table(results);
    
    return results;
  } catch (error) {
    console.error('❌ Local database error:', error);
    return [];
  }
};

// Supabase connection
const checkSupabaseTables = async () => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.log('⚠️  Supabase credentials not found');
      return [];
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔍 Testing Supabase connection...');
    
    // Test connection by checking auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Supabase auth connection failed:', authError);
      return [];
    }
    
    console.log(`✅ Supabase auth connection verified (${authUsers.users.length} users)`);
    
    // Try to check if data tables exist in Supabase
    const tablesToCheck = [
      'users', 'profiles', 'posts', 'comments', 'likes', 'reactions',
      'friends', 'followers', 'friend_requests', 'friendships',
      'messages', 'conversations', 'conversation_participants',
      'notifications', 'statuses', 'groups', 'group_members'
    ];
    
    const existingTables = [];
    
    for (const table of tablesToCheck) {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (!error) {
        existingTables.push(table);
        console.log(`✅ Found table: ${table}`);
      } else {
        console.log(`❌ Table not found: ${table}`);
      }
    }

    console.log('\n📊 Supabase Data Tables Found:');
    console.table(existingTables.map(t => ({ table_name: t })));
    
    return existingTables;
  } catch (error) {
    console.error('❌ Supabase connection error:', error);
    return [];
  }
};

// Compare schemas
const compareSchemas = async () => {
  console.log('🔍 Starting database schema comparison...\n');
  
  const localTables = await checkLocalTables();
  const supabaseTables = await checkSupabaseTables();

  const localTableNames = new Set(localTables.map((t: any) => t.table_name));
  const supabaseTableNames = new Set(supabaseTables.map((t: any) => t.table_name));

  const onlyInLocal = [...localTableNames].filter(t => !supabaseTableNames.has(t));
  const onlyInSupabase = [...supabaseTableNames].filter(t => !localTableNames.has(t));
  const commonTables = [...localTableNames].filter(t => supabaseTableNames.has(t));

  console.log('\n📈 Schema Comparison Results:');
  console.log(`Common tables: ${commonTables.length}`);
  console.log(`Only in local DB: ${onlyInLocal.length}`);
  console.log(`Only in Supabase: ${onlyInSupabase.length}`);

  if (onlyInLocal.length > 0) {
    console.log('\n🏠 Tables only in local database:');
    console.log(onlyInLocal);
  }

  if (onlyInSupabase.length > 0) {
    console.log('\n☁️  Tables only in Supabase:');
    console.log(onlyInSupabase);
  }

  if (commonTables.length > 0) {
    console.log('\n🔗 Common tables (potential migration targets):');
    console.log(commonTables);
  }

  process.exit(0);
};

compareSchemas();