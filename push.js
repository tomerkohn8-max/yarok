// Push reminders through Firebase Cloud Messaging.
// The page calls window.yarokPush.enable() when the person turns on phone
// notifications, and window.yarokPush.sync(payload) whenever the schedule
// changes. The hourly GitHub Action (scripts/send-reminders.mjs) reads the
// saved schedule and sends the morning reminder.
import { firebaseConfig, vapidKey } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';
const configured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && vapidKey);
let ctx = null;
let token = null;
let pending = null;
let timer = null;

async function init() {
  if (ctx) return ctx;
  const [{ initializeApp }, msg, fs] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-messaging.js`),
    import(`${SDK}/firebase-firestore.js`)
  ]);
  if (!(await msg.isSupported())) throw new Error('unsupported');
  const app = initializeApp(firebaseConfig);
  ctx = { msg, fs, messaging: msg.getMessaging(app), db: fs.getFirestore(app) };
  return ctx;
}

async function getDeviceToken() {
  const { msg, messaging } = await init();
  const reg = await navigator.serviceWorker.ready;
  token = await msg.getToken(messaging, { vapidKey, serviceWorkerRegistration: reg });
  try { localStorage.setItem('yarok-fcm-token', token); } catch (e) {}
  return token;
}

async function write(payload) {
  if (!token) return;
  const { fs, db } = await init();
  await fs.setDoc(fs.doc(db, 'devices', token), {
    ...payload,
    token,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    updatedAt: fs.serverTimestamp()
  }, { merge: true });
}

window.yarokPush = {
  configured,
  // Returns 'ok', 'denied', 'unsupported' or 'not-configured'.
  async enable(payload) {
    if (!configured) return 'not-configured';
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return 'denied';
    try {
      await getDeviceToken();
      await write({ ...payload, enabled: true });
      return 'ok';
    } catch (e) {
      console.warn('push enable failed', e);
      return 'unsupported';
    }
  },
  // Debounced: saves the latest schedule a second after the last change.
  sync(payload) {
    if (!configured) return;
    pending = payload;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        if (!token) {
          try { token = localStorage.getItem('yarok-fcm-token'); } catch (e) {}
          if (!token) return;
        }
        await write(pending);
      } catch (e) { console.warn('push sync failed', e); }
    }, 1000);
  }
};
