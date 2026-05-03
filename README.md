# 🎯 ניהול פרויקטים — ProjectsManagerWeb (V1.13)

אפליקציית ווב לניהול פרויקטים ומשימות עם הפרדה בין הקשר **עבודה** להקשר **אישי**, מבוססת React + TypeScript + Vite, עם Supabase כ-Backend.

## ✨ תכונות עיקריות

### ניווט ותצוגה
- 🔐 **אימות** דרך Supabase Auth (סיסמה בלבד)
- 💼 **שני הקשרים**: עבודה / אישי — כל אחד עם פרויקטים ומשימות נפרדים
- 📌 **זכירת מצב** — הטאב וה-Scope האחרון נשמרים ב-localStorage ומשוחזרים בפתיחה
- 📊 **רצועת סטטיסטיקות** צמודה ל-header (פרויקטים פעילים, משימות פתוחות, דחופות, הושלמו)

### פרויקטים
- ➕ יצירה, עריכה ומחיקה של פרויקטים עם סטטוס, עדיפות ותאריך יעד
- 📁 **קבצים מקושרים** (Google Drive)
- 📈 **סרגל התקדמות** לפי אחוז משימות שהושלמו
- 🗓️ **Timeline** — לחיצה על פרויקט מהיילט עם תאריך סיום מציגה ציר זמן עם עיגולים ממוספרים וצבעוניים למשימות; לחיצה על עיגול מציגה tooltip עם שם ותאריך

### משימות
- ✅ **סימון הושלם** מיידי (לחיצת checkbox שומרת ישירות ללא כפתור שמור)
- 🗒️ **הערות inline** — לחיצה על משימה מהיילטת מציגה הערות לקריאה; לחיצת עיפרון עוברת לעריכה (שמירה אוטומטית על blur)
- 🔍 אינדיקטור 📝 על משימות עם הערות
- 🏷️ שם הפרויקט מוצג בראש כל שורת משימה
- 🙈 כפתור **"הסתר שהסתיימו"** — ברירת מחדל: משימות שהסתיימו נשארות עם קו חוצה

### ארגון וסינון
- 📂 **תצוגת "ללא פרויקט"** — משימות עצמאיות ללא שיוך לפרויקט
- 🗂️ **הושלמו / נגנזו** — לינקים משניים תחת כל טאב ראשי
- 🔃 **מיון** לפי עדיפות / חדש ראשון / ישן ראשון / קרוב לסיום (נפרד לפרויקטים ומשימות)
- 🔎 סינון משימות לפי פרויקט נבחר

### היסטוריה וזמן
- 🕐 **חותמת זמן** (סגולה) על כל משימה ופרויקט: נפתח / נסגר / ⏱ זמן חיים
- `closed_at` נרשם אוטומטית בעת סימון כהושלם ומתאפס בביטול
- תאריך סגירה מוצג רק על המשימה האחרונה שנסגרה בפרויקט (פחות רעש ויזואלי)

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8
- **Styling**: Tailwind CSS 3, lucide-react icons
- **Backend**: Supabase (Auth + PostgreSQL)
- **Utils**: date-fns, clsx, tailwind-merge

## 📦 התקנה

```bash
npm install
```

צור קובץ `.env.local` בשורש הפרויקט:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_KEY=your-publishable-key
```

## 🚀 שימוש

```bash
npm run dev       # פיתוח
npm run build     # build לפרודקשן
npm run preview   # תצוגה מקדימה
```

## 📁 מבנה הפרויקט

```
src/
├── components/
│   ├── AddDialog.tsx        # דיאלוג יצירה/עריכה לפרויקטים ומשימות
│   ├── Auth.tsx             # מסך כניסה
│   ├── InlineChangeActions.tsx
│   ├── ProjectCard.tsx      # כרטיס פרויקט
│   ├── ProjectFiles.tsx     # ניהול קבצים
│   ├── ProjectTimeline.tsx  # ציר זמן פרויקט
│   ├── Stats.tsx            # רצועת סטטיסטיקות
│   └── TaskRow.tsx          # שורת משימה
├── hooks/
│   ├── useAuth.ts
│   └── useData.ts           # useProjects, useTasks, useFileCounts
├── lib/
│   ├── supabase.ts          # client + types + enums
│   └── utils.ts             # cn, formatDate, formatDateTime, formatLifetime
├── App.tsx                  # layout ראשי + לוגיקת תצוגה
└── main.tsx
```

## 🌐 פריסה

פריסה אוטומטית ל-GitHub Pages דרך GitHub Actions בכל push ל-`main`.

## 📝 License

Private project.
