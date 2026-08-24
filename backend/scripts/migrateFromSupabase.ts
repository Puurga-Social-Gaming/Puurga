import { createClient } from '@supabase/supabase-js';
import sequelize from '../config/database';
import { 
  User, Post, Comment, Reaction, Like, Notification, 
  Follower, FriendRequest, Friendship, Message, 
  Conversation, ConversationParticipant, Status, 
  PostPurge, UserSurvivalState, Profile 
} from '../models';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Migration statistics
const stats = {
  users: 0,
  posts: 0,
  comments: 0,
  reactions: 0,
  likes: 0,
  notifications: 0,
  followers: 0,
  friendRequests: 0,
  friendships: 0,
  messages: 0,
  conversations: 0,
  conversationParticipants: 0,
  statuses: 0,
  postPurges: 0,
  userSurvivalStates: 0,
  profiles: 0,
  errors: [] as string[]
};

async function migrateUsers() {
  console.log('🔄 Migrating users...');
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    for (const user of users || []) {
      await User.upsert({
        id: user.id,
        name: user.full_name || user.name || 'User',
        username: user.username,
        email: user.email,
        password: user.password || 'default_password_hash', // Will need proper migration
        avatar: user.avatar_url,
        bio: user.bio,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      });
      stats.users++;
    }

    console.log(`✅ Migrated ${stats.users} users`);
  } catch (error) {
    console.error('❌ Error migrating users:', error);
    stats.errors.push(`Users: ${error}`);
  }
}

async function migrateProfiles() {
  console.log('🔄 Migrating profiles...');
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    for (const profile of profiles || []) {
      await Profile.upsert({
        id: profile.id,
        full_name: profile.full_name,
        username: profile.username,
        email: profile.email,
        avatar_url: profile.avatar_url,
        cover_photo: profile.cover_photo,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
        occupation: profile.occupation,
        education: profile.education,
        relationship: profile.relationship,
        role: profile.role || 'user',
        is_private: profile.is_private || false,
        hide_from_suggestions: profile.hide_from_suggestions || false,
        message_requests: profile.message_requests || 'everyone',
        show_read_receipts: profile.show_read_receipts !== false,
        show_online_status: profile.show_online_status !== false,
        comment_privacy: profile.comment_privacy || 'everyone',
        story_privacy: profile.story_privacy || 'everyone',
        is_blocked: profile.is_blocked || false,
        purga_points: profile.purga_points || 0,
        certification_slug: profile.certification_slug,
        logo_certified: profile.logo_certified || false,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      });
      stats.profiles++;
    }

    console.log(`✅ Migrated ${stats.profiles} profiles`);
  } catch (error) {
    console.error('❌ Error migrating profiles:', error);
    stats.errors.push(`Profiles: ${error}`);
  }
}

async function migratePosts() {
  console.log('🔄 Migrating posts...');
  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    for (const post of posts || []) {
      await Post.upsert({
        id: post.id,
        user_id: post.user_id,
        content: post.content,
        media_url: post.media_url,
        created_at: post.created_at,
        updated_at: post.updated_at || post.created_at,
        last_edited: post.last_edited
      });
      stats.posts++;
    }

    console.log(`✅ Migrated ${stats.posts} posts`);
  } catch (error) {
    console.error('❌ Error migrating posts:', error);
    stats.errors.push(`Posts: ${error}`);
  }
}

async function migrateComments() {
  console.log('🔄 Migrating comments...');
  try {
    const { data: comments, error } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    for (const comment of comments || []) {
      await Comment.upsert({
        id: comment.id,
        post_id: comment.post_id,
        user_id: comment.user_id,
        content: comment.content,
        created_at: comment.created_at,
        updated_at: comment.updated_at || comment.created_at
      });
      stats.comments++;
    }

    console.log(`✅ Migrated ${stats.comments} comments`);
  } catch (error) {
    console.error('❌ Error migrating comments:', error);
    stats.errors.push(`Comments: ${error}`);
  }
}

async function migrateReactions() {
  console.log('🔄 Migrating reactions...');
  try {
    const { data: reactions, error } = await supabase
      .from('reactions')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    for (const reaction of reactions || []) {
      await Reaction.upsert({
        id: reaction.id,
        post_id: reaction.post_id,
        user_id: reaction.user_id,
        type: reaction.type,
        created_at: reaction.created_at
      });
      stats.reactions++;
    }

    console.log(`✅ Migrated ${stats.reactions} reactions`);
  } catch (error) {
    console.error('❌ Error migrating reactions:', error);
    stats.errors.push(`Reactions: ${error}`);
  }
}

async function migrateLikes() {
  console.log('🔄 Migrating likes...');
  try {
    const { data: likes, error } = await supabase
      .from('likes')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    for (const like of likes || []) {
      await Like.upsert({
        id: like.id,
        post_id: like.post_id,
        user_id: like.user_id,
        created_at: like.created_at
      });
      stats.likes++;
    }

    console.log(`✅ Migrated ${stats.likes} likes`);
  } catch (error) {
    console.error('❌ Error migrating likes:', error);
    stats.errors.push(`Likes: ${error}`);
  }
}

async function migrateNotifications() {
  console.log('🔄 Migrating notifications...');
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    for (const notification of notifications || []) {
      await Notification.upsert({
        id: notification.id,
        receiver_id: notification.receiver_id,
        sender_id: notification.sender_id,
        type: notification.type,
        content: notification.content,
        read: notification.read || false,
        created_at: notification.created_at,
        post_id: notification.post_id,
        comment_id: notification.comment_id
      });
      stats.notifications++;
    }

    console.log(`✅ Migrated ${stats.notifications} notifications`);
  } catch (error) {
    console.error('❌ Error migrating notifications:', error);
    stats.errors.push(`Notifications: ${error}`);
  }
}

async function migrateFollowers() {
  console.log('🔄 Migrating followers...');
  try {
    const { data: followers, error } = await supabase
      .from('followers')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    for (const follower of followers || []) {
      await Follower.upsert({
        id: follower.id,
        follower_id: follower.follower_id,
        following_id: follower.following_id,
        created_at: follower.created_at
      });
      stats.followers++;
    }

    console.log(`✅ Migrated ${stats.followers} followers`);
  } catch (error) {
    console.error('❌ Error migrating followers:', error);
    stats.errors.push(`Followers: ${error}`);
  }
}

async function migrateFriendRequests() {
  console.log('🔄 Migrating friend requests...');
  try {
    const { data: friendRequests, error } = await supabase
      .from('friend_requests')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    for (const friendRequest of friendRequests || []) {
      await FriendRequest.upsert({
        id: friendRequest.id,
        sender_id: friendRequest.sender_id,
        receiver_id: friendRequest.receiver_id,
        status: friendRequest.status || 'pending',
        created_at: friendRequest.created_at,
        updated_at: friendRequest.updated_at || friendRequest.created_at
      });
      stats.friendRequests++;
    }

    console.log(`✅ Migrated ${stats.friendRequests} friend requests`);
  } catch (error) {
    console.error('❌ Error migrating friend requests:', error);
    stats.errors.push(`FriendRequests: ${error}`);
  }
}

async function migrateFriendships() {
  console.log('🔄 Migrating friendships...');
  try {
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    for (const friendship of friendships || []) {
      await Friendship.upsert({
        id: friendship.id,
        user_id: friendship.user_id,
        friend_id: friendship.friend_id,
        status: friendship.status || 'accepted',
        created_at: friendship.created_at,
        updated_at: friendship.updated_at || friendship.created_at
      });
      stats.friendships++;
    }

    console.log(`✅ Migrated ${stats.friendships} friendships`);
  } catch (error) {
    console.error('❌ Error migrating friendships:', error);
    stats.errors.push(`Friendships: ${error}`);
  }
}

async function migrateMessages() {
  console.log('🔄 Migrating messages...');
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    for (const message of messages || []) {
      await Message.upsert({
        id: message.id,
        conversationId: message.conversation_id,
        senderId: message.sender_id,
        content: message.content,
        read: message.read || false,
        createdAt: message.created_at,
        updatedAt: message.updated_at || message.created_at
      });
      stats.messages++;
    }

    console.log(`✅ Migrated ${stats.messages} messages`);
  } catch (error) {
    console.error('❌ Error migrating messages:', error);
    stats.errors.push(`Messages: ${error}`);
  }
}

async function migrateConversations() {
  console.log('🔄 Migrating conversations...');
  try {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    for (const conversation of conversations || []) {
      await Conversation.upsert({
        id: conversation.id,
        name: conversation.name,
        isGroup: conversation.is_group || false,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at || conversation.created_at
      });
      stats.conversations++;
    }

    console.log(`✅ Migrated ${stats.conversations} conversations`);
  } catch (error) {
    console.error('❌ Error migrating conversations:', error);
    stats.errors.push(`Conversations: ${error}`);
  }
}

async function migrateConversationParticipants() {
  console.log('🔄 Migrating conversation participants...');
  try {
    const { data: participants, error } = await supabase
      .from('conversation_participants')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    for (const participant of participants || []) {
      await ConversationParticipant.upsert({
        id: participant.id,
        conversationId: participant.conversation_id,
        userId: participant.user_id,
        createdAt: participant.created_at
      });
      stats.conversationParticipants++;
    }

    console.log(`✅ Migrated ${stats.conversationParticipants} conversation participants`);
  } catch (error) {
    console.error('❌ Error migrating conversation participants:', error);
    stats.errors.push(`ConversationParticipants: ${error}`);
  }
}

async function migrateStatuses() {
  console.log('🔄 Migrating statuses...');
  try {
    const { data: statuses, error } = await supabase
      .from('statuses')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    for (const status of statuses || []) {
      await Status.upsert({
        id: status.id,
        userId: status.user_id,
        content: status.content,
        mediaUrl: status.media_url,
        type: status.type || 'text',
        expiresAt: status.expires_at,
        createdAt: status.created_at,
        updatedAt: status.updated_at || status.created_at
      });
      stats.statuses++;
    }

    console.log(`✅ Migrated ${stats.statuses} statuses`);
  } catch (error) {
    console.error('❌ Error migrating statuses:', error);
    stats.errors.push(`Statuses: ${error}`);
  }
}

async function migratePostPurges() {
  console.log('🔄 Migrating post purges...');
  try {
    const { data: postPurges, error } = await supabase
      .from('post_purges')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    for (const postPurge of postPurges || []) {
      await PostPurge.upsert({
        id: postPurge.id,
        post_id: postPurge.post_id,
        user_id: postPurge.user_id,
        created_at: postPurge.created_at
      });
      stats.postPurges++;
    }

    console.log(`✅ Migrated ${stats.postPurges} post purges`);
  } catch (error) {
    console.error('❌ Error migrating post purges:', error);
    stats.errors.push(`PostPurges: ${error}`);
  }
}

async function migrateUserSurvivalStates() {
  console.log('🔄 Migrating user survival states...');
  try {
    const { data: survivalStates, error } = await supabase
      .from('user_survival_state')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    for (const survivalState of survivalStates || []) {
      await UserSurvivalState.upsert({
        id: survivalState.id,
        user_id: survivalState.user_id,
        visibility_score: survivalState.visibility_score || 100,
        tier: survivalState.tier || 'STABLE',
        ghost_mode: survivalState.ghost_mode || false,
        purge_count: survivalState.purge_count || 0,
        created_at: survivalState.created_at,
        updated_at: survivalState.updated_at || survivalState.created_at
      });
      stats.userSurvivalStates++;
    }

    console.log(`✅ Migrated ${stats.userSurvivalStates} user survival states`);
  } catch (error) {
    console.error('❌ Error migrating user survival states:', error);
    stats.errors.push(`UserSurvivalStates: ${error}`);
  }
}

async function runMigration() {
  console.log('🚀 Starting data migration from Supabase to local PostgreSQL...');
  console.log('===========================================');

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Connected to local PostgreSQL database');

    // Test Supabase connection - try to get any table
    let testError = null;
    try {
      const { data: testUser, error: err } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      testError = err;
    } catch (err) {
      testError = err;
    }
    
    if (testError) {
      console.warn('⚠️ Cannot connect to Supabase or tables do not exist:', String(testError));
      console.log('⚠️ Skipping data migration - starting with empty local database');
      console.log('===========================================');
      console.log('📊 Migration Summary:');
      console.log('No data migrated - starting fresh');
      console.log('\n✅ Migration completed (no data to migrate)!');
      process.exit(0);
    }
    console.log('✅ Connected to Supabase');

    // Migrate in order of dependencies
    await migrateUsers();
    await migrateProfiles();
    await migrateConversations();
    await migrateConversationParticipants();
    await migratePosts();
    await migrateComments();
    await migrateReactions();
    await migrateLikes();
    await migrateNotifications();
    await migrateFollowers();
    await migrateFriendRequests();
    await migrateFriendships();
    await migrateMessages();
    await migrateStatuses();
    await migratePostPurges();
    await migrateUserSurvivalStates();

    console.log('===========================================');
    console.log('📊 Migration Summary:');
    console.log(`Users: ${stats.users}`);
    console.log(`Profiles: ${stats.profiles}`);
    console.log(`Posts: ${stats.posts}`);
    console.log(`Comments: ${stats.comments}`);
    console.log(`Reactions: ${stats.reactions}`);
    console.log(`Likes: ${stats.likes}`);
    console.log(`Notifications: ${stats.notifications}`);
    console.log(`Followers: ${stats.followers}`);
    console.log(`Friend Requests: ${stats.friendRequests}`);
    console.log(`Friendships: ${stats.friendships}`);
    console.log(`Messages: ${stats.messages}`);
    console.log(`Conversations: ${stats.conversations}`);
    console.log(`Conversation Participants: ${stats.conversationParticipants}`);
    console.log(`Statuses: ${stats.statuses}`);
    console.log(`Post Purges: ${stats.postPurges}`);
    console.log(`User Survival States: ${stats.userSurvivalStates}`);

    if (stats.errors.length > 0) {
      console.log('\n⚠️ Errors encountered:');
      stats.errors.forEach(err => console.log(`  - ${err}`));
    }

    console.log('\n✅ Migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
runMigration();