# 🎯 ניהול פרויקטים — ProjectsManagerWeb (V1.25)

אפליקציית ווב לניהול פרויקטים ומשימות עם הפרדה בין הקשר **עבודה** להקשר **אישי**, מבוססת React + TypeScript + Vite, עם Supabase כ-Backend.

## ✨ תכונות עיקריות

### אימות ומשתמשים
- 🔐 **Google OAuth** דרך Supabase Auth — כניסה עם חשבון Google
- 👤 **ריבוי משתמשים** — כל משתמש רואה רק את הנתונים שלו (Row Level Security)
- 💼 **שני הקשרים**: עבודה / אישי — כל אחד עם פרויקטים ומשימות נפרדים
- 📌 **זכירת מצב** — הטאב וה-Scope האחרון נשמרים ב-localStorage

### סנכרון Google Calendar
- 📅 **סנכרון אוטומטי** של משימות עם `due_date` ל-Google Calendar
- 🗂️ **בחירת יומן לפי פרויקט** — כל פרויקט מסנכרן ליומן נפרד לפי בחירת המשתמש
- 🗓️ **יומן ברירת מחדל** למשימות חופשיות (ללא פרויקט) — נשאל פעם אחת בלבד
- ✏️ **יצירה / עדכון / מחיקה** — האירוע מתעדכן בכל שינוי `due_date`, ונמחק אם `due_date` הוסר
- 🔔 **תזכורות חכמות** — ברירת מחדל: יום לפני + שעתיים לפני, ניתנות להגדרה מלאה
- ⚙️ **הגדרות קלנדר** — שינוי יומן ברירת מחדל וניהול תזכורות מה-header בכל עת
- 🏷️ **חתימה ייחודית** בתיאור האירוע עם שם המשימה, עדיפות, סטטוס והפניה לאפליקציה

### פרויקטים
- ➕ יצירה, עריכה ומחיקה עם סטטוס, עדיפות ותאריך יעד
- 📁 **קבצים מקושרים** (Google Drive)
- 📈 **סרגל התקדמות** — רקע צבעוני לפי אחוז השלמה
- ✅ **השלמה אוטומטית** — פרויקט שכל משימותיו הושלמו עובר ל"הושלמו" אוטומטית
- 📅 **אייקון קלנדר** על כרטיס פרויקט כשהסנכרון פעיל

### משימות
- ✅ **סימון הושלם** מיידי (checkbox שומר ישירות)
- 🗒️ **הערות inline** — לחיצה מציגה הערות; עיפרון עובר לעריכה עם שמירה אוטומטית
- 🔀 **גרירה וסידור ידני** — D&D מלא דרך @dnd-kit
- 🤖 **הצעות AI** — משימות מוצעות על ידי AI עם אישור/דחייה
- 📱 **Swipe למחיקה** במובייל
- 📅 **אייקון קלנדר** על משימות מסונכרנות
- ❄️ **הקפאת משימות** עם אפשרות שחזור

### ארגון וסינון
- 📂 **תצוגת "ללא פרויקט"** — משימות חופשיות
- 🗂️ **הושלמו / נגנזו** — לינקים משניים תחת כל טאב
- 🔃 **מיון** לפי עדיפות / חדש / ישן / קרוב לסיום / ידני
- 🔎 **סינון** משימות לפי פרויקט נבחר
- 🙈 **הסתר שהסתיימו**

### היסטוריה וזמן
- 🕐 **חותמת זמן** (סגולה): נפתח / נסגר / ⏱ זמן חיים
- `closed_at` נרשם אוטומטית ומתאפס בביטול
- 📊 **רצועת סטטיסטיקות** — פרויקטים פעילים, משימות פתוחות/דחופות/הושלמו

---

## 🛠️ Tech Stack

| שכבה | טכנולוגיה |
|------|-----------|
| Frontend | React 19, TypeScript, Vite 8 |
| Styling | Tailwind CSS 3, lucide-react |
| Backend | Supabase (Auth + PostgreSQL + RLS) |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable |
| Calendar | Google Calendar REST API v3 (browser-side) |
| Deployment | GitHub Pages + GitHub Actions |

---

## 📦 התקנה

```bash
npm install
```

צור קובץ `.env.local` בשורש:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_KEY=your-publishable-key
```

---

## 🚀 שימוש

```bash
npm run dev        # פיתוח
npm run qa         # שער איכות: lint + tests + build
npm run build      # build לפרודקשן
npm run preview    # תצוגה מקדימה
```

---

## 📁 מבנה הפרויקט

```
src/
├── components/
│   ├── AddDialog.tsx              # דיאלוג יצירה/עריכה — פרויקטים ומשימות + בחירת יומן
│   ├── Auth.tsx                   # מסך כניסה עם Google OAuth
│   ├── CalendarPickerDialog.tsx   # בחירת יומן Google (רשימה + יצירת יומן חדש)
│   ├── CalendarSettingsDialog.tsx # הגדרות קלנדר + ניהול תזכורות
│   ├── InlineChangeActions.tsx    # כפתורי שמור/בטל inline
│   ├── ProjectCard.tsx            # כרטיס פרויקט עם סרגל התקדמות
│   ├── ProjectFiles.tsx           # ניהול קבצי Google Drive
│   ├── SortableTaskList.tsx       # רשימת משימות עם D&D
│   ├── Stats.tsx                  # רצועת סטטיסטיקות
│   └── TaskRow.tsx                # שורת משימה
├── hooks/
│   ├── useAuth.ts                 # ניהול session
│   ├── useCalendarSync.ts         # סנכרון Google Calendar
│   └── useData.ts                 # useProjects, useTasks, useFileCounts
├── lib/
│   ├── googleCalendar.ts          # Google Calendar REST API client
│   ├── projectProgress.ts         # חישובי התקדמות פרויקט
│   ├── supabase.ts                # client + types + enums
│   └── utils.ts                   # cn, formatDate, formatDateTime, formatLifetime
├── App.tsx
└── main.tsx
```

---

## 🔐 Google Calendar — הגדרה ראשונית

הסנכרון עובד דרך `provider_token` שמוחזר בעת כניסה עם Google. הטוקן תקף ~שעה; לאחר פקיעה יש להתחבר מחדש.

1. **משתמש חדש** — כניסה עם Google מעניקה אוטומטית הרשאת קלנדר.
2. **משתמש קיים שהתחבר לפני V1.25** — נדרשת כניסה מחדש פעם אחת לאישור ה-scope.
3. **פרויקט עם due_date** — ערוך פרויקט → סמן "סנכרן ליומן Google" → בחר יומן (נשאל פעם אחת).
4. **משימה חופשית עם due_date** — בשמירה הראשונה יופיע דיאלוג לבחירת יומן ברירת מחדל.
5. **שינוי הגדרות** — כפתור "הגדרות קלנדר" ב-header.

---

## ✅ QA

```bash
npm run qa   # lint + vitest + build
```

דוחות אוטומטיים נשמרים ב-`.qa/test-runs/`, דוחות ידניים ב-`.qa/review-output/`.

> Windows: אם PowerShell חוסם `npm.ps1`, הרץ `npm.cmd run qa`

---

## 🌐 פריסה

פריסה אוטומטית ל-GitHub Pages בכל push ל-`main` דרך GitHub Actions.

---

## 📝 License

Private project.
