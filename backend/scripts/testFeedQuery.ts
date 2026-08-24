import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';

const testFeedQuery = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to local PostgreSQL');

    // Test the feed query
    const posts = await sequelize.query(
      `SELECT id, user_id, content, media_url, created_at, updated_at,
             last_edited, purge_count, visibility, background_index
      FROM posts
      ORDER BY created_at DESC
      LIMIT 10 OFFSET 0`,
      {
        replacements: [],
        type: QueryTypes.SELECT
      }
    );

    console.log('\n📊 Feed Query Results:');
    console.table(posts);

    console.log(`\n📈 Found ${posts.length} posts`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testFeedQuery();