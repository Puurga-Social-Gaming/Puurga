const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables directly
const envPath = path.join(__dirname, '../backend/.env');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].replace(/['"]/g, '');
    } else if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseKey = line.split('=')[1].replace(/['"]/g, '');
    }
  }
}

async function listBucketContents() {
  try {
    console.log('🔍 Connecting to Supabase...');
    console.log('SUPABASE_URL:', supabaseUrl ? '***PRESENT***' : '***MISSING***');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '***PRESENT***' : '***MISSING***');

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔍 Accessing "logos" bucket...');

    // List all files in the logos bucket
    const { data: files, error } = await supabase.storage
      .from('logos')
      .list();

    if (error) {
      console.error('❌ Error listing files in logos bucket:', error);
      console.log('💡 Check if the bucket name is "logos" (lowercase)');
      return;
    }

    console.log('📁 Files found in logos bucket:');
    files.forEach(file => {
      console.log(`  - ${file.name} (${file.updated_at})`);
    });

    console.log(`\nTotal files: ${files.length}`);

    // Check for expected files
    const expectedFiles = ['2dLight.png', '2dDark.png', '3dLight.png', '3dDark.png'];
    console.log('\n🔍 Checking for expected files:');
    expectedFiles.forEach(expectedFile => {
      const found = files.find(f => f.name === expectedFile);
      if (found) {
        console.log(`  ✅ ${expectedFile} - FOUND`);
      } else {
        console.log(`  ❌ ${expectedFile} - NOT FOUND`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listBucketContents();
