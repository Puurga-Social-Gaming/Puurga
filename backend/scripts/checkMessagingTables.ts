import sequelize from '../config/database';

const checkMessagingTables = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to local PostgreSQL');

    // Check for messaging-related tables
    const [messagingTables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%message%' OR table_name LIKE '%conversation%')
      ORDER BY table_name;
    `);

    console.log('\n📊 Messaging-related tables in local database:');
    console.table(messagingTables);

    // Check table schemas
    if (messagingTables.length > 0) {
      for (const table of messagingTables as any[]) {
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
      console.log('⚠️  No messaging-related tables found in local database');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkMessagingTables();