# 📚 Translation Keys Reference Guide

All translation keys that have been implemented and are working:

## 🔑 Posts Section

### posts namespace
```
posts.noPostsToDisplay        → "No posts to display"
posts.loadMore                → "Load More Posts"
posts.loading                 → "Loading..."
posts.failedToFetch           → "Failed to fetch posts"
posts.failedToLoadMore        → "Failed to load more posts"
posts.compressingImages       → "Compressing images..."
posts.imagesCompressed        → "Images compressed successfully"
posts.maxImagesError          → "Maximum 4 images allowed"
posts.errorProcessing         → "Error processing images"
posts.emptyPostError          → "Please add some content or images to your post"
posts.errorCreating           → "Error creating post"
posts.errorDeleting           → "Error deleting post"
posts.postDeletedSuccess      → "Post deleted successfully"
```

### createPost namespace
```
createPost.placeholder        → "Share your thoughts here..."
createPost.post               → "Post"
createPost.addImages          → "Add Images"
createPost.addEmoji           → "Add Emoji"
```

### postActions namespace
```
postActions.edit              → "Edit"
postActions.delete            → "Delete"
postActions.share             → "Share"
postActions.purge             → "Purge"
postActions.unpurge           → "Unpurge"
postActions.comment           → "Comment"
postActions.like              → "Like"
postActions.puurga            → "Puurga"
```

### postEdit namespace
```
postEdit.updatedSuccess       → "Post updated successfully"
postEdit.updateFailed         → "Failed to update post"
postEdit.editing              → "Editing..."
postEdit.deleteConfirm        → "Are you sure you want to delete this post?"
postEdit.cancelEdit           → "Cancel"
```

---

## 🧭 Navigation Section

### navigation namespace
```
navigation.home               → "Home"
navigation.profile            → "Profile"
navigation.messages           → "Messages"
navigation.groups             → "Groups"
navigation.games              → "Puurga Games"
navigation.dashboard          → "Puurga Dashboard"
navigation.help               → "Help"
navigation.notifications      → "Notifications"
navigation.settings           → "Settings"
navigation.logout             → "Logout"
navigation.more               → "More"
navigation.gaming             → "Gaming"
navigation.puurga             → "PUURGA"
```

---

## 👥 Right Sidebar Section

### rightSidebar namespace
```
rightSidebar.quickActions     → "Quick Actions"
rightSidebar.createPost       → "Create Post"
rightSidebar.exploreGroups    → "Explore Groups"
rightSidebar.notifications    → "Notifications"
rightSidebar.settings         → "Settings"

rightSidebar.myProfile        → "My Profile"
rightSidebar.viewFullProfile  → "View Full Profile"
rightSidebar.myConnections    → "My Connections"

rightSidebar.friendRequests   → "Friend Requests"
rightSidebar.loadingText      → "Loading..."
rightSidebar.noFriendRequests → "No friend requests."

rightSidebar.onlineFriends    → "Online Friends"
rightSidebar.noFriendsOnline  → "No friends online."

rightSidebar.peopleYouMayKnow → "People You May Know"
rightSidebar.noSuggestions    → "No suggestions at the moment."

rightSidebar.stats.posts      → "Posts"
rightSidebar.stats.following  → "Following"
rightSidebar.stats.followers  → "Followers"
```

---

## 🌐 Language Codes

Use these codes to switch languages:
```
'en'  → English
'fr'  → Français (French)
'zu'  → isiZulu (Zulu)
'ss'  → SiSwati (Siswati)
```

### Example: Switch Language in Code
```javascript
import i18n from 'i18next';

// Switch to French
i18n.changeLanguage('fr');

// Switch to Zulu
i18n.changeLanguage('zu');

// Switch to English
i18n.changeLanguage('en');
```

---

## 📝 How to Use Translation Keys in Components

### Basic Usage
```tsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <button>
      {t('posts.loadMore')}
    </button>
  );
};
```

### With Nested Keys
```tsx
const { t } = useTranslation();

return (
  <div>
    <p>{t('rightSidebar.stats.posts')}</p>  // "Posts"
    <p>{t('rightSidebar.stats.following')}</p> // "Following"
  </div>
);
```

### In Template Strings
```tsx
const { t } = useTranslation();

const message = `${t('common.loading')} ${t('posts.loadMore')}`;
// Result: "Loading... Load More Posts"
```

---

## 🔍 Finding Translation Keys

### Organized by Feature

**Posts Feature**
- `posts.*` - Main post display
- `createPost.*` - Create post form
- `postActions.*` - Post action buttons
- `postEdit.*` - Edit post functionality

**Navigation Feature**
- `navigation.*` - All navigation labels
- `navigation.home` - Home link
- `navigation.profile` - Profile link
- etc.

**Right Sidebar Feature**
- `rightSidebar.*` - All sidebar content
- `rightSidebar.stats.*` - Profile statistics

---

## 📍 Translation Files Location

All translation keys are stored in:
```
/src/i18n/locales/
├── en.json      (English)
├── fr.json      (French)
├── zu.json      (Zulu)
└── ss.json      (Siswati)
```

---

## ✅ Verification

### Check if Translation Works
1. Import in component: `import { useTranslation } from 'react-i18next';`
2. Get translation function: `const { t } = useTranslation();`
3. Use key in JSX: `{t('namespace.key')}`
4. Switch language using globe icon
5. ✅ Text should change instantly

### If Translation Doesn't Work
1. ❌ Check key exists in all 4 JSON files
2. ❌ Check component uses `useTranslation()` hook
3. ❌ Check key name matches exactly (case-sensitive)
4. ❌ Check namespace matches (e.g., `posts.*`)
5. ❌ Check no typos in key path

---

## 🎯 Common Patterns

### Loading State
```tsx
{isLoading ? (
  <span>{t('rightSidebar.loadingText')}</span> // "Loading..."
) : (
  <span>{content}</span>
)}
```

### Empty State
```tsx
{items.length === 0 ? (
  <p>{t('rightSidebar.noFriendRequests')}</p> // "No friend requests."
) : (
  // render items
)}
```

### Error Messages
```tsx
catch (error) {
  toast.error(t('posts.failedToFetch'));
}
```

### Button Labels
```tsx
<button>
  {t('posts.loadMore')} 
  {/* Changes language based on user selection */}
</button>
```

---

## 📊 Statistics

- **Total Namespaces:** 3
  - posts (including createPost, postActions, postEdit)
  - navigation
  - rightSidebar

- **Total Keys:** 40+
  - Posts: 13+
  - Navigation: 12+
  - Right Sidebar: 16+

- **Total Translations:** 160+
  - English: 40+
  - French: 40+
  - Zulu: 40+
  - Siswati: 40+

- **Languages Supported:** 4
  - English (en)
  - French (fr)
  - Zulu (zu)
  - Siswati (ss)

---

## 🔗 Related Files

- Translation configuration: `/src/i18n/index.ts`
- English translations: `/src/i18n/locales/en.json`
- French translations: `/src/i18n/locales/fr.json`
- Zulu translations: `/src/i18n/locales/zu.json`
- Siswati translations: `/src/i18n/locales/ss.json`
- Language selector: `/src/components/LanguageSelector.tsx`
- Language service: `/src/services/languageService.ts`

---

## 📚 Documentation

For more information, see:
- `TRANSLATION_IMPLEMENTATION_POSTS_AND_SIDEBARS.md` - Detailed implementation guide
- `TRANSLATION_QUICK_REFERENCE.md` - Quick reference
- `TRANSLATION_COMPLETE.md` - Completion summary

---

**Last Updated:** January 21, 2026
**Status:** ✅ All Keys Implemented and Working
