# PUURGA APPLICATION - DEVELOPER GUIDE FOR FEATURE COMPLETION

## Overview
This guide is for developers working on completing partially implemented features and creating missing functionality in the Puurga application. The app is a social media platform with unique ghost mode, credit system, and game integration features.

## Application Architecture

### Frontend
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with custom glassmorphism design
- **State Management**: React Context, custom hooks, Zustand stores
- **Real-time**: WebSocket integration via wsManager
- **Animations**: Framer Motion
- **Internationalization**: i18next (11 languages)

### Backend
- **Runtime**: Node.js with Express
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Real-time**: WebSocket Manager
- **Services**: Service layer architecture (creditService, notificationService, etc.)

### Key Directories
- `/src/components/` - React components
- `/src/pages/` - Page components
- `/src/context/` - React contexts
- `/src/hooks/` - Custom hooks
- `/src/store/` - State stores
- `/backend/routes/` - API routes
- `/backend/services/` - Business logic services
- `/backend/middleware/` - Express middleware
- `/backend/websocketManager.ts` - WebSocket management

## Getting Started

### Prerequisites
- Node.js and npm/yarn
- Supabase account and project
- Environment variables configured

### Environment Variables
Check `.env` file for required variables:
- Supabase URL and anon key
- Database connection strings
- Any third-party service credentials (Zego Cloud for video calls, etc.)

### Running the Application
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run backend server
npm run server
```

## Feature Completion Strategy

### Step 1: Review Feature Files
Each feature file in `FEATURES_TO_FIX/` and `FEATURES_TO_CREATE/` contains:
- Current state description
- What needs to be done
- Technical notes with file locations
- Acceptance criteria

### Step 2: Understand Existing Patterns
Before implementing new features, study existing similar features:
- **For messaging**: Look at existing direct messaging implementation
- **For reactions**: Study PostReactions component
- **For games**: Reference PurgaSlicer game implementation
- **For credits**: Review CreditService class

### Step 3: Database Schema
Check database schema in Supabase:
- Use Supabase dashboard to view tables
- Refer to existing table structures for new features
- Consider migrations for schema changes

### Step 4: API Development
Follow existing API patterns:
- Routes in `/backend/routes/`
- Middleware in `/backend/middleware/`
- Services in `/backend/services/`
- Error handling and validation

### Step 5: Frontend Integration
Integrate with existing frontend patterns:
- Components in `/src/components/`
- Pages in `/src/pages/`
- Hooks in `/src/hooks/`
- WebSocket integration for real-time features

### Step 6: Testing
Test thoroughly:
- Unit tests for services
- Integration tests for API
- Manual testing for UI
- Real-time feature testing with WebSocket

## Priority Order

### Phase 1: Critical Fixes (High Priority)
1. **Dashboard Real Stats** - Replace hardcoded data
2. **Message Editing/Deletion** - Core messaging functionality
3. **Social Blocked/Muted** - Important user safety feature
4. **Video Calls Configuration** - Enable existing video call feature

### Phase 2: Important Completions (Medium Priority)
5. **Group Chat** - Complete messaging system
6. **Integrated Game Slots** - Complete game offerings
7. **Credit Transaction History** - User-facing credit management
8. **Location/User Tagging** - Complete post features
9. **Post Analytics** - Important for content creators
10. **Auth Enhancements** - 2FA, OAuth, verification

### Phase 3: Nice-to-Have Features (Low Priority)
11. **Game Infrastructure** - Servers, matchmaking, tournaments
12. **Advanced Social** - Friend circles, birthdays, discovery
13. **Post Enhancements** - Scheduling, drafts, archiving
14. **Security Enhancements** - Encryption, biometrics

## Common Patterns

### WebSocket Integration
For real-time features, use the existing WebSocket manager:
```typescript
import { wsManager } from '@/context/WebSocketContext';

// Send to specific user
wsManager.sendToUser(userId, { type: 'notification', data: {...} });

// Broadcast to friends
wsManager.broadcastToFriends(userId, { type: 'update', data: {...} });
```

### Credit System Integration
For features involving credits:
```typescript
import { CreditService } from '@/backend/services/creditService';

// Award credits
await CreditService.awardCredits(userId, amount, reason, transactionType);

// Deduct credits
await CreditService.deductCredits(userId, amount, reason, transactionType);
```

### Authentication Middleware
For protected routes:
```typescript
import { authenticateUser } from '@/backend/middleware/auth';
import { validateNotGhosted } from '@/backend/middleware/restrictGhosted';

router.post('/api/endpoint', authenticateUser, validateNotGhosted, handler);
```

### Database Queries
Use Supabase client:
```typescript
import { supabase } from '@/utils/supabase';

const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', userId);
```

## Important Notes

### Ghost Mode Integration
Many features need to respect ghost mode:
- Ghosted users cannot post, comment, or message
- Use `validateNotGhosted` middleware
- Check `is_ghost` field in user profiles

### Credit Economy
Consider credit implications:
- Award credits for positive actions
- Deduct credits for certain features
- Respect daily credit caps
- Log all credit transactions

### Privacy Settings
Respect user privacy preferences:
- Check privacy settings before showing content
- Respect `is_private`, `hide_from_suggestions` flags
- Consider message request settings
- Handle online status visibility

### Internationalization
All new UI text should support i18n:
- Add translation keys to locale files
- Use `useTranslation` hook
- Support all 11 languages

### Responsive Design
Ensure mobile responsiveness:
- Use Tailwind responsive classes
- Test on mobile viewports
- Consider touch interactions
- Implement mobile-specific UI where needed

## Testing Checklist

Before marking a feature complete:
- [ ] Feature works as described in acceptance criteria
- [ ] UI is consistent with existing design
- [ ] Mobile responsive
- [ ] Error handling is in place
- [ ] Real-time features work with WebSocket
- [ ] Credit system integration works (if applicable)
- [ ] Ghost mode restrictions are respected (if applicable)
- [ ] Privacy settings are honored (if applicable)
- [ ] Internationalization works (if UI text added)
- [ ] No console errors
- [ ] Performance is acceptable

## Getting Help

### Code Reference
- Study similar existing features
- Check component patterns in `/src/components/`
- Review API patterns in `/backend/routes/`

### Database Reference
- Use Supabase dashboard to view schema
- Check existing table structures
- Understand relationships between tables

### Architecture Reference
- Service layer: `/backend/services/`
- Middleware: `/backend/middleware/`
- Context: `/src/context/`
- Hooks: `/src/hooks/`

## Deployment Considerations

### Database Migrations
For schema changes:
- Create Supabase migrations
- Test migrations in development
- Plan for data migration if needed

### Environment Variables
New features may require:
- Add to `.env` file
- Document in deployment guide
- Configure in production

### API Changes
For new/modified APIs:
- Update API documentation
- Consider backward compatibility
- Version APIs if breaking changes

## Completion Tracking

As you complete features:
1. Mark the feature file as complete
2. Update the README in respective directory
3. Test thoroughly
4. Document any breaking changes
5. Update this guide if needed

## Contact

For questions about:
- **Architecture**: Review existing code patterns
- **Database**: Check Supabase dashboard
- **API**: Review existing routes and services
- **Frontend**: Study existing components and hooks

Good luck with feature completion! The codebase is well-organized and follows good patterns - use them as your guide.

