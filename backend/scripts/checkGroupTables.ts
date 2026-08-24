import sequelize from '../config/database';

const checkGroupTables = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to local PostgreSQL');

    // Check for group-related tables
    const [groupTables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%group%' OR table_name LIKE '%member%')
      ORDER BY table_name;
    `);

    console.log('\n📊 Group-related tables in local database:');
    console.table(groupTables);

    // Check if groups table exists and get schema
    if (groupTables.length > 0) {
      for (const table of groupTables as any[]) {
        console.log(`\n📋 Schema for ${table.table_name}:`);
        const [schema] = await sequelize.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = '${table.table_name}'
          ORDER BY ordinal_position;
        `);
        console.table(schema);
      }
    } else {
      console.log('⚠️  No group-related tables found in local database');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkGroupTables();