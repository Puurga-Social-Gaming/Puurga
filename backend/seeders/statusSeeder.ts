import Status from '../models/Status';
import User from '../models/User';

export const seedStatuses = async () => {
  try {
    // Get all users
    const users = await User.findAll();
    if (users.length === 0) {
      console.log('No users found to create statuses for');
      return;
    }

    // Sample status content
    const sampleStatuses = [
      {
        content: '🎉 Just launched a new project! 🚀',
        type: 'text' as const
      },
      {
        content: 'Enjoying a beautiful sunset 🌅 #blessed',
        type: 'text' as const
      },
      {
        content: '🎮 Game night with friends! 🎲',
        type: 'text' as const
      },
      {
        content: 'Working on something exciting... 💡',
        type: 'text' as const
      },
      {
        content: '☕️ Coffee time! ✨',
        type: 'text' as const
      }
    ];

    // Create statuses for each user
    for (const user of users) {
      const randomStatus = sampleStatuses[Math.floor(Math.random() * sampleStatuses.length)];
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await Status.create({
        user_id: user.id,
        content: randomStatus.content,
        type: randomStatus.type,
        expires_at: expiresAt,
        media_url: undefined
      });
    }

    console.log('✅ Sample statuses created successfully');
  } catch (error) {
    console.error('Error seeding statuses:', error);
  }
}; 