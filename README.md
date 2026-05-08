# 🎯 ניהול פרויקטים — ProjectsManagerWeb (V1.15)

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
npm run qa        # שער איכות: lint + tests + build + דוח ריצה
npm run build     # build לפרודקשן
npm run preview   # תצוגה מקדימה
```

## ✅ צוות איכות ו-QA

לפרויקט יש מבנה QA מובנה שמטרתו לבדוק את האפליקציה מול הדרישות, מול סטנדרטי פיתוח, ומול חוויית משתמש בעברית/RTL. המבנה בנוי כסוכנים מומחים קטנים שמופעלים על ידי Orchestrator מרכזי.

### מבנה הסוכנים

```text
QA Orchestrator
├── Product QA Agent
│   └── בדיקת התאמה לדרישות ולזרימות מוצר
├── UX/A11y Agent
│   └── בדיקת שימושיות, RTL, מובייל ונגישות בסיסית
└── Engineering Agent
    └── בדיקת קוד, הרצת QA, תיקון באגים ובדיקות רגרסיה
```

פירוט מלא נמצא ב-`docs/qa-team/agents.md`.

| תפקיד | אחריות | תוצר |
| --- | --- | --- |
| Orchestrator | מפעיל סבב QA, מאחד ממצאים ומתעדף תיקונים | דוח סיכום ותוכנית פעולה |
| Product QA | בודק התאמה לדרישות המוצר | סטטוס לכל דרישה וממצאי פערים |
| UX/A11y Reviewer | בודק מובייל, RTL, נגישות בסיסית וזרימת שימוש | ממצאי UX עם חומרה והמלצה |
| Engineering Reviewer | בודק קוד, בדיקות, Supabase ותקינות build | תיקונים, בדיקות רגרסיה ודוח סיכון |

### תהליך סבב QA

1. קוראים את הדרישות ב-`docs/qa-team/requirements.md`.
2. מסמנים מצב דרישות ב-`docs/qa-team/acceptance-checklist.md`.
3. מבצעים בדיקת UX/RTL לפי `docs/qa-team/ux-review-checklist.md`.
4. מריצים שער איכות:

   ```bash
   npm run qa
   ```

5. מתעדים ממצאים לפי `docs/qa-team/bug-report-template.md`.
6. מתקנים באגים ומוסיפים/מעדכנים בדיקות רגרסיה.
7. סוגרים סבב עם דוח לפי `docs/qa-team/review-report-template.md`.

### שער איכות אוטומטי

הפקודה `npm run qa` מריצה ברצף:

- `npm run lint`
- `npm run test:run`
- `npm run build`

כל ריצה יוצרת דוח Markdown תחת:

```text
.qa/test-runs/
```

דוחות סיכום ידניים/ניהוליים נשמרים תחת:

```text
.qa/review-output/
```

ב-Windows, אם PowerShell חוסם את `npm.ps1`, אפשר להריץ:

```bash
npm.cmd run qa
```

### מבנה קבצי QA

```text
docs/qa-team/
├── README.md                  # הסבר כללי על תהליך האיכות
├── agents.md                  # מבנה הסוכנים וזרימת העבודה ביניהם
├── roles.md                   # תפקידי צוות ה-QA
├── requirements.md            # דרישות מוצר עם מזהים יציבים
├── acceptance-checklist.md    # צ'קליסט בדיקה מול הדרישות
├── ux-review-checklist.md     # בדיקות UX, RTL, מובייל ונגישות
├── engineering-standards.md   # סטנדרטי פיתוח לפרויקט
├── release-gate.md            # תנאי מעבר לפני פריסה
├── bug-report-template.md     # תבנית דיווח באג
└── review-report-template.md  # תבנית דוח סבב QA

.qa/
├── test-runs/                 # דוחות אוטומטיים של npm run qa
└── review-output/             # דוחות סיכום של סבבי QA

scripts/
└── qa-check.mjs               # סקריפט שער האיכות
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
