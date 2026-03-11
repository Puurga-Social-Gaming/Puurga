import sequelize from '../config/database';
import fs from 'fs';
import path from 'path';

async function runMigration() {
    try {
        console.log('Running friend suggestions SQL migration...');
        const sqlPath = path.join(__dirname, '../migrations/create_get_friend_suggestions.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Execute the SQL to replace the function
        await sequelize.query(sql);

        console.log('✅ Friend suggestions SQL function updated successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to update friend suggestions SQL function:', error);
        process.exit(1);
    }
}

runMigration();
