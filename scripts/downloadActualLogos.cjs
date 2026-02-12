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

async function downloadLogosFromSupabase() {
  try {
    console.log('🔍 Connecting to Supabase...');
    console.log('SUPABASE_URL:', supabaseUrl ? '***PRESENT***' : '***MISSING***');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '***PRESENT***' : '***MISSING***');

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      console.log('📝 Please check your .env file in backend directory');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔍 Accessing "Logos" bucket...');

    // List all files in the Logos bucket
    const { data: files, error } = await supabase.storage
      .from('Logos')
      .list();

    if (error) {
      console.error('❌ Error listing files in Logos bucket:', error);
      console.log('💡 Check if the bucket name is "Logos" (capital L)');
      return;
    }

    console.log('📁 Files found in Logos bucket:', files.map(f => f.name));

    // Target files from user with correct capitalization
    const targetFiles = ['2dLight.png', '2dDark.png', '3dLight.png', '3dDark.png'];

    // Download each target file
    for (const targetFile of targetFiles) {
      console.log(`⬇️  Downloading ${targetFile}...`);

      const { data, error: downloadError } = await supabase.storage
        .from('Logos')
        .download(targetFile);

      if (downloadError) {
        console.error(`❌ Error downloading ${targetFile}:`, downloadError);
        console.log(`💡 Make sure "${targetFile}" exists in your Supabase "logos" bucket`);
        continue;
      }

      // Save to logos directory
      const filePath = path.join(__dirname, '../public/images/logos', targetFile);
      
      // Convert Blob to Buffer if needed
      let fileData = data;
      if (data instanceof Blob) {
        fileData = Buffer.from(await data.arrayBuffer());
      }
      
      fs.writeFileSync(filePath, fileData);
      console.log(`✅ Saved ${targetFile} to ${filePath}`);

      // Show file info
      const stats = fs.statSync(filePath);
      console.log(`📊 File size: ${stats.size} bytes`);
    }

    console.log('🎉 All logos downloaded successfully!');

    // Verify files exist
    console.log('\n🔍 Verifying downloaded files:');
    const logosDir = path.join(__dirname, '../public/images/logos');
    const dirFiles = fs.readdirSync(logosDir);
    console.log('Files in logos directory:', dirFiles);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if your Supabase bucket is named "logos" (lowercase)');
    console.log('2. Verify the files exist: 2d light.png, 2d dark.png, 3d light.png, 3d dark.png');
    console.log('3. Make sure the bucket is public or your service role key has access');
  }
}

downloadLogosFromSupabase();
