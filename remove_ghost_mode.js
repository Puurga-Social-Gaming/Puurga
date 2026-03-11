// Remove user from ghost mode by clearing all purges
import { supabase } from './backend/dist/config/supabase.js';

async function removeGhostMode() {
  try {
    const currentUserId = '2d0dbbda-183b-419e-bd12-84b7cf07473f'; // Amena Knapp
    
    console.log('Checking current ghost status...');
    
    // Check current profile status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUserId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return;
    }

    console.log('Current profile status:', {
      isGhost: profile.is_ghost,
      purgeCount: profile.purge_count,
      ghostedAt: profile.ghosted_at,
      ghostedUntil: profile.ghosted_until,
      ghostStatus: profile.ghost_status
    });

    // Remove ghost mode by updating profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_ghost: false,
        purge_count: 0,
        ghosted_at: null,
        ghosted_until: null,
        ghost_status: 'active',
        ghost_recovery_count: 0,
        is_hidden: false,
        is_restricted: false
      })
      .eq('id', currentUserId);

    if (updateError) {
      console.error('Error removing ghost mode:', updateError);
      return;
    }

    console.log('✅ Successfully removed ghost mode!');
    console.log('Updated profile status:');

    // Verify the changes
    const { data: updatedProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('is_ghost, purge_count, ghosted_at, ghosted_until, ghost_status')
      .eq('id', currentUserId)
      .single();

    if (verifyError) {
      console.error('Error verifying changes:', verifyError);
    } else {
      console.log(updatedProfile);
    }

    // Also check if there are any purge records to clean up
    console.log('\nChecking for any purge records...');
    
    // Try with different column names
    const { data: purgeRecords1, error: purgeError1 } = await supabase
      .from('purges')
      .select('*')
      .eq('target_user_id', currentUserId);

    if (purgeError1 && purgeError1.code !== '42703') {
      console.error('Error checking purge records (target_user_id):', purgeError1);
    } else if (!purgeError1) {
      console.log(`Found ${purgeRecords1.length} purge records (target_user_id):`);
      if (purgeRecords1.length > 0) {
        // Delete all purge records for this user
        const { error: deleteError } = await supabase
          .from('purges')
          .delete()
          .eq('target_user_id', currentUserId);

        if (deleteError) {
          console.error('Error deleting purge records:', deleteError);
        } else {
          console.log('✅ Deleted all purge records (target_user_id)');
        }
      }
    }

    // Also check for purger_id records
    const { data: purgeRecords2, error: purgeError2 } = await supabase
      .from('purges')
      .select('*')
      .eq('purger_id', currentUserId);

    if (purgeError2 && purgeError2.code !== '42703') {
      console.error('Error checking purge records (purger_id):', purgeError2);
    } else if (!purgeError2) {
      console.log(`Found ${purgeRecords2.length} purge records as purger (purger_id):`);
      if (purgeRecords2.length > 0) {
        // Delete all purge records where this user was the purger
        const { error: deleteError2 } = await supabase
          .from('purges')
          .delete()
          .eq('purger_id', currentUserId);

        if (deleteError2) {
          console.error('Error deleting purger records:', deleteError2);
        } else {
          console.log('✅ Deleted all purger records (purger_id)');
        }
      }
    }

    // Check all purge records to see the table structure
    const { data: allPurges, error: allPurgesError } = await supabase
      .from('purges')
      .select('*')
      .limit(5);

    if (allPurgesError) {
      console.log('Purges table might not exist or has different structure:', allPurgesError.message);
    } else {
      console.log('Sample purge records to see table structure:');
      console.log(allPurges);
    }

    console.log('\n🎉 Ghost mode has been completely disabled!');
    console.log('You should now be able to use all features normally.');

  } catch (error) {
    console.error('Error removing ghost mode:', error);
  }
}

removeGhostMode();
