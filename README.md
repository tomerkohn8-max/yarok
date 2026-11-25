# ירוק בבית

אפליקציית ווב לטיפול בצמחי בית, בעיצוב זכוכית על רקע ג׳ונגל. עובדת בטלפון כאפליקציה מותקנת (PWA): מסך מלא, אייקון במסך הבית ושימוש בלי אינטרנט.

## מה יש בה
- **היום:** טבעת התקדמות, משימות השקיה עם "השקיתי", "עדיין רטוב" ו"דחה למחר", וטיפ לפי מזג האוויר.
- **הצמחים שלי:** כרטיס לכל צמח עם רמת מים וסטטוס. כרטיס מפורט עם נתוני טיפול, היסטוריית השקיות וטיפ.
- **הוספה:** זיהוי צמח מתמונה (כרגע מדומה) ולוח טיפול מוכן.
- **הצמחים שלי:** עשרה צמחים אמיתיים עם תמונה חתוכה, מצב, חוות דעת על העציץ ורשימת משימות.
- **תזכורות:** תזכורת יומית מרוכזת, התראות מזג אוויר, מצב חופשה, שיתוף עם בני הבית, והתראות אמיתיות בטלפון.

הנתונים נשמרים בדפדפן (localStorage). זיהוי צמח חדש מתמונה עדיין מדומה.

## הרצה מקומית
```bash
python3 -m http.server 8000
# ואז לפתוח http://localhost:8000
```

## פרסום ב-GitHub Pages
Settings → Pages → Source: `Deploy from a branch` → Branch: `main` / `(root)`.
אחרי כדקה האפליקציה זמינה בכתובת `https://<username>.github.io/<repo>/`.

## התקנה בטלפון
- **אייפון (Safari):** שיתוף ← "הוספה למסך הבית". התראות עובדות רק מהאפליקציה המותקנת (iOS 16.4 ומעלה).
- **אנדרואיד (Chrome):** תפריט ← "התקנת אפליקציה".

## התראות עם Firebase
התזכורת היומית מגיעה גם כשהאפליקציה סגורה. הטלפון שומר את לוח ההשקיה שלו ב-Firestore, ו-GitHub Action שרץ כל שעה שולח לכל טלפון תזכורת אחת ביום, בשעה שנבחרה, ורק אם יש צמח שמחכה לטיפול. הכל עובד במסלול החינמי של Firebase (Spark).

1. **יצירת פרויקט:** ב-[Firebase console](https://console.firebase.google.com) יוצרים פרויקט, ומוסיפים לו Web app (סמל `</>`).
2. **הגדרות האתר:** מעתיקים את ה-config של ה-Web app לקובץ `firebase-config.js`.
3. **מפתח VAPID:** ב-Project settings ← Cloud Messaging ← Web Push certificates לוחצים Generate key pair, ומדביקים את המפתח ב-`vapidKey` שבאותו קובץ.
4. **Firestore:** ב-Build ← Firestore Database לוחצים Create database (מצב production), ובלשונית Rules מדביקים את התוכן של `firestore.rules`.
5. **מפתח שרת:** ב-Project settings ← Service accounts לוחצים Generate new private key ומורידים קובץ JSON. **זה מפתח סודי.** לא מעלים אותו למאגר.
6. **הגדרות ב-GitHub:** ב-Settings ← Secrets and variables ← Actions:
   - Secret בשם `FIREBASE_SERVICE_ACCOUNT` עם כל התוכן של קובץ ה-JSON.
   - Variable בשם `APP_URL` עם כתובת האפליקציה ב-GitHub Pages.
7. **בדיקה:** בלשונית Actions מריצים ידנית את "Plant reminders" (Run workflow).
8. **בטלפון:** פותחים את האפליקציה (באייפון, מהאייקון במסך הבית) ← תזכורות ← מפעילים "התראות בטלפון".

שימו לב: GitHub משהה תהליכים מתוזמנים במאגר ציבורי שלא היה בו שום שינוי 60 יום. אם זה קורה, מפעילים אותם מחדש בלשונית Actions.

## מבנה
- `index.html`: כל האפליקציה (HTML, CSS ו-JS)
- `sw.js`: service worker לעבודה בלי אינטרנט, להצגת התראות ולפתיחת האפליקציה מהתראה
- `push.js`, `firebase-config.js`: חיבור ל-Firebase Cloud Messaging ושמירת לוח ההשקיה
- `scripts/send-reminders.mjs`, `.github/workflows/reminders.yml`: שליחת התזכורת היומית
- `firestore.rules`: כללי אבטחה ל-Firestore
- `manifest.webmanifest`, `icons/`: התקנה כאפליקציה
- `img/`: תמונות הצמחים והרקע
