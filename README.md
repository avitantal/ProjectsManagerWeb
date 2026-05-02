# 🎯 ניהול פרויקטים — ProjectsManagerWeb

אפליקציית ווב לניהול פרויקטים ומשימות עם הפרדה בין הקשר **מפעל** להקשר **אישי**, מבוססת React + TypeScript + Vite, עם Supabase כ-Backend ואימות משתמשים.

## ✨ תכונות עיקריות

- 🔐 **אימות משתמשים** דרך Supabase Auth
- 🏭 **שני הקשרים (Scopes)**: מפעל / אישי — כל אחד עם הפרויקטים והמשימות שלו
- 📊 **סטטיסטיקות** של פרויקטים ומשימות בזמן אמת
- ✅ **ניהול משימות** עם סטטוס, סינון לפי פרויקט והתקדמות
- 🎨 **ממשק RTL** בעברית, מבוסס Tailwind CSS
- 🚀 **פריסה ל-GitHub Pages** מובנית

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8
- **Styling**: Tailwind CSS 3, lucide-react icons
- **Backend**: Supabase (Auth + Database)
- **Utils**: date-fns, clsx, tailwind-merge

## 📦 התקנה

```bash
npm install
```

צור קובץ `.env` בשורש הפרויקט עם משתני Supabase:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_KEY=your-anon-or-publishable-key
```

## 🚀 שימוש

```bash
# פיתוח
npm run dev

# Build לפרודקשן
npm run build

# תצוגה מקדימה של ה-build
npm run preview

# Lint
npm run lint
```

## 📁 מבנה הפרויקט

```
src/
├── components/      # רכיבי UI (Auth, ProjectCard, TaskRow, Stats, AddDialog...)
├── hooks/           # useAuth, useData (useProjects, useTasks)
├── lib/             # supabase client, utils
├── App.tsx          # רכיב ראשי + ניווט בין scopes
└── main.tsx         # נקודת כניסה
```

## 🌐 פריסה

ה-`vite.config.ts` מוגדר אוטומטית עם `base: '/ProjectsManagerWeb/'` כש-`GITHUB_ACTIONS` מוגדר, מתאים לפריסה ל-GitHub Pages.

## 📝 License

Private project.
