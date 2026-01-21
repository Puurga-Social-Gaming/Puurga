# 🌐 Quick Test Guide: Posts Translation

**Test that the Posts feature works in all 4 languages**

---

## Step 1: Start Your App
```bash
npm run dev
```
Navigate to `http://localhost:5174`

---

## Step 2: Test Language Switching

### English (Default)
- You should see "No posts to display" (if no posts exist)
- Button text: "Load More Posts"
- Create post placeholder: "Share your thoughts here..."

### Switch to French 🇫🇷
1. Click the **Globe icon** 🌐 in the header
2. Select **"Français"**
3. Refresh the page (F5 or Cmd+R)
4. Verify:
   - Empty state: "Aucun post à afficher"
   - Load button: "Charger plus de posts"
   - Create post placeholder: "Partagez vos pensées ici..."
   - Menu: "Modifier" / "Supprimer"

### Switch to Zulu 🇿🇦
1. Click the **Globe icon** 🌐
2. Select **"isiZulu"**
3. Refresh the page
4. Verify:
   - Empty state: "Azikho izindebele zokubuka"
   - Load button: "Layida izindebele eziningi"
   - Create post placeholder: "Yabelana ngeengcinga zakho lapha..."

### Switch to Siswati 🇸🇿
1. Click the **Globe icon** 🌐
2. Select **"SiSwati"**
3. Refresh the page
4. Verify:
   - Empty state: "Azikho imilayezo yekubuka"
   - Load button: "Layida imilayezo-emibili"
   - Create post placeholder: "Yabelana ngeengcingo zakho lapha..."

---

## Step 3: Test Error Messages

### Test "Too Many Images" Error
1. In Create Post box, click image button
2. Try to select more than 4 images
3. See error message in your selected language:
   - 🇬🇧 English: "Maximum 4 images allowed"
   - 🇫🇷 French: "4 images maximum autorisées"
   - 🇿🇦 Zulu: "Izithombe ezingu-4 kuphela ezivumelekile"
   - 🇸🇿 Siswati: "Zimithombe 4 kuphela ezivumelekile"

### Test "Empty Post" Error
1. Try to post with no content or images
2. See error message in your selected language:
   - 🇬🇧 English: "Please add some content or images to your post"
   - 🇫🇷 French: "Veuillez ajouter du contenu ou des images à votre post"
   - 🇿🇦 Zulu: "Ngobaki ucwaningo noma izithombe kuzindebele zakho"
   - 🇸🇿 Siswati: "Ngcwalisa lokuva noma zimithombe kumilayezo yakho"

---

## Step 4: Test Edit/Delete Menu

1. Create a post
2. Click the **three dots** ⋮ on your post
3. See menu options in current language:
   - 🇬🇧 English: "Edit Post" / "Delete Post"
   - 🇫🇷 French: "Modifier" / "Supprimer"
   - 🇿🇦 Zulu: "Hlela" / "Susa"
   - 🇸🇿 Siswati: "Hlela" / "Susa"

---

## Step 5: Test Create Post Button

1. Click in the textarea
2. The interface expands
3. Check the button text:
   - 🇬🇧 English: "Post"
   - 🇫🇷 French: "Poster"
   - 🇿🇦 Zulu: "Faka"
   - 🇸🇿 Siswati: "Faka"

Also check Cancel button:
   - 🇬🇧 English: "Cancel"
   - 🇫🇷 French: "Annuler"
   - 🇿🇦 Zulu: "Khansela"
   - 🇸🇿 Siswati: "Khansela"

---

## ✅ What Should Happen

1. ✅ Language selector works (globe icon in header)
2. ✅ Clicking a language changes the UI text
3. ✅ Refreshing the page keeps the selected language
4. ✅ All Posts-related text updates in real-time
5. ✅ No console errors
6. ✅ All 4 languages work smoothly

---

## 🚨 Troubleshooting

### Language doesn't change after selecting
- Clear your browser cache (Ctrl+Shift+Delete / Cmd+Shift+Delete)
- Try incognito/private window
- Check browser console for errors (F12)

### See [object Object] instead of text
- Refresh the page (F5)
- This means the translation key wasn't found
- Check the browser console for warnings

### Language keeps reverting to English
- Make sure your user is logged in
- Check that the API call succeeded (Network tab in DevTools)
- Verify the language is being saved to the database

---

## 📊 Test Checklist

Create a checklist to verify all languages:

```
Posts Component Translation Test
├── [ ] English - All text displays correctly
├── [ ] French - All text translated to French
├── [ ] Zulu - All text translated to Zulu
├── [ ] Siswati - All text translated to Siswati
├── [ ] Error messages work in all languages
├── [ ] Edit/Delete menu translates properly
├── [ ] Create post button text changes
├── [ ] Placeholder text changes per language
└── [ ] Language persists after page refresh
```

---

## 📁 Files You Can Check

To verify the translations are in the code:

**English translations:**
```
/src/i18n/locales/en.json
```
Look for section: `"posts": {...}`

**French translations:**
```
/src/i18n/locales/fr.json
```
Look for section: `"posts": {...}`

**Component code:**
```
/src/pages/Home.tsx
/src/components/Post/PostList.tsx
/src/components/Post/CreatePost.tsx
/src/components/Post/Post.tsx
```

Each should have: `const { t } = useTranslation();`

---

## 💬 Example Text to Look For

When testing Zulu, you should see:
- "Azikho izindebele zokubuka" (No posts to display)
- "Layida izindebele eziningi" (Load more posts)
- "Yabelana ngeengcinga zakho lapha..." (Share your thoughts here)

When testing French, you should see:
- "Aucun post à afficher" (No posts to display)
- "Charger plus de posts" (Load more posts)
- "Partagez vos pensées ici..." (Share your thoughts here)

---

**If everything works, the Posts feature is fully internationalized! 🎉**
