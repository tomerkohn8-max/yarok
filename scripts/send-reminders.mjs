// Sends the daily watering reminder. Runs hourly from GitHub Actions.
// Each device gets at most one reminder a day, at or after its chosen hour,
// and only when a plant needs water or its fortnightly photo.
import admin from 'firebase-admin';

const DAY = 864e5;
const APP_URL = process.env.APP_URL || '';

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
});
const db = admin.firestore();

// Calendar date ("YYYY-MM-DD") and hour of a moment in a given time zone.
function local(date, tz) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23'
    }).formatToParts(date).map(p => [p.type, p.value])
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}
const dayNumber = day => Date.UTC(...day.split('-').map((n, i) => Number(n) - (i === 1 ? 1 : 0))) / DAY;

function message(due, combine) {
  if (due.length === 1 || !combine) {
    const p = due[0];
    return { title: `${p.name}: ${p.act === 'השקיה' ? 'אני קצת צמא' : 'הגיע הזמן להחליף לי מים'}`, body: due.length > 1 ? `ועוד ${due.length - 1} צמחים מחכים` : 'פתח את ירוק בבית כדי לסמן' };
  }
  return { title: `${due.length} צמחים צריכים טיפול היום`, body: due.map(p => p.name).join(', ') };
}

const now = new Date();
const snap = await db.collection('devices').where('enabled', '==', true).get();
let sent = 0;

for (const doc of snap.docs) {
  const d = doc.data();
  const tz = d.tz || 'Asia/Jerusalem';
  const { day, hour } = local(now, tz);
  const remindHour = Number(String(d.time || '08:30').split(':')[0]);
  if (d.lastSent === day || hour < remindHour) continue;

  const today = dayNumber(day);
  const age = at => today - dayNumber(local(new Date(at), tz).day);
  const due = (d.plants || []).filter(p => age(p.at) >= p.every);
  const shots = (d.plants || []).filter(p => p.photoEvery && p.photoAt && age(p.photoAt) >= p.photoEvery);
  if (!due.length && !shots.length) continue;

  let title, body;
  if (due.length) {
    ({ title, body } = message(due, d.combine !== false));
    if (shots.length) body += ` · וגם יום צילום: ${shots.map(p => p.name).join(', ')}`;
  } else {
    title = 'יום צילום 📸';
    body = `הגיע הזמן לצלם את ${shots.map(p => p.name).join(', ')} ולראות כמה ${shots.length > 1 ? 'הם גדלו' : 'הוא גדל'}`;
  }
  try {
    await admin.messaging().send({
      token: d.token,
      data: { title, body, url: APP_URL || './' },
      webpush: { headers: { Urgency: 'high', TTL: '43200' }, fcmOptions: APP_URL ? { link: APP_URL } : undefined }
    });
    await doc.ref.update({ lastSent: day });
    sent++;
  } catch (e) {
    if (e.code === 'messaging/registration-token-not-registered' || e.code === 'messaging/invalid-argument') {
      await doc.ref.delete();
    } else {
      console.error(doc.id.slice(0, 12), e.code || e.message);
    }
  }
}
console.log(`devices: ${snap.size}, reminders sent: ${sent}`);
