// Inovense — Premium line icons (24x24, 1.5 stroke)
const Icon = ({ children, size = 18, stroke = 1.5, className = "", style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    {children}
  </svg>
);

const I = {
  arrow:      (p) => <Icon {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Icon>,
  arrowUR:    (p) => <Icon {...p}><path d="M7 17 17 7" /><path d="M8 7h9v9" /></Icon>,
  check:      (p) => <Icon {...p}><path d="M4 12.5 9 17.5 20 6.5" /></Icon>,
  x:          (p) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>,
  dot:        (p) => <Icon {...p}><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" /></Icon>,
  plus:       (p) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>,
  spark:      (p) => <Icon {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /></Icon>,
  bolt:       (p) => <Icon {...p}><path d="M13 3 5 14h6l-2 7 8-11h-6l2-7Z" /></Icon>,
  brain:      (p) => <Icon {...p}><path d="M9 4a3 3 0 0 0-3 3v0a3 3 0 0 0-2 5 3 3 0 0 0 2 5v0a3 3 0 0 0 3 3h0a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm6 0a3 3 0 0 1 3 3v0a3 3 0 0 1 2 5 3 3 0 0 1-2 5v0a3 3 0 0 1-3 3h0a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /></Icon>,
  layers:     (p) => <Icon {...p}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /><path d="m3 18 9 5 9-5" /></Icon>,
  shield:     (p) => <Icon {...p}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" /></Icon>,
  check2:     (p) => <Icon {...p}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></Icon>,
  cube:       (p) => <Icon {...p}><path d="m12 3 9 5v8l-9 5-9-5V8l9-5Z" /><path d="M3 8l9 5 9-5M12 13v8" /></Icon>,
  database:   (p) => <Icon {...p}><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></Icon>,
  flow:       (p) => <Icon {...p}><circle cx="5" cy="5" r="2" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" /><path d="M7 5h10M5 7v10M19 7v10M7 19h10" /></Icon>,
  inbox:      (p) => <Icon {...p}><path d="M3 13h6l1 2h4l1-2h6" /><path d="M5 5h14l2 8v6H3v-6L5 5Z" /></Icon>,
  cpu:        (p) => <Icon {...p}><rect x="6" y="6" width="12" height="12" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" /></Icon>,
  globe:      (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></Icon>,
  user:       (p) => <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></Icon>,
  users:      (p) => <Icon {...p}><circle cx="9" cy="8" r="4" /><path d="M2 21c0-4 3-7 7-7s7 3 7 7" /><circle cx="17" cy="6" r="3" /><path d="M14 14c4 0 8 2 8 6" /></Icon>,
  message:    (p) => <Icon {...p}><path d="M21 12a8 8 0 1 1-3-6.2L21 4l-1 4a8 8 0 0 1 1 4Z" /></Icon>,
  doc:        (p) => <Icon {...p}><path d="M14 3H6v18h12V7l-4-4Z" /><path d="M14 3v4h4" /><path d="M9 13h6M9 17h4" /></Icon>,
  chart:      (p) => <Icon {...p}><path d="M4 20V10M10 20V4M16 20v-6M22 20H2" /></Icon>,
  search:     (p) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></Icon>,
  settings:   (p) => <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="m19 12 1.5-1-2-3.4-1.8.7-1.4-.8L15 5h-4l-.3 2.4-1.4.8-1.8-.7-2 3.4L7 12l-1.5 1 2 3.4 1.8-.7 1.4.8L11 19h4l.3-2.4 1.4-.8 1.8.7 2-3.4L19 12Z" /></Icon>,
  filter:     (p) => <Icon {...p}><path d="M3 5h18l-7 9v6l-4-2v-4L3 5Z" /></Icon>,
  bell:       (p) => <Icon {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2Z" /><path d="M10 20a2 2 0 1 0 4 0" /></Icon>,
  briefcase:  (p) => <Icon {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 13h18" /></Icon>,
  target:     (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /></Icon>,
  megaphone:  (p) => <Icon {...p}><path d="M3 11v2l13 6V5L3 11Z" /><path d="M3 13h2v6h3v-4" /><path d="M19 8a4 4 0 0 1 0 8" /></Icon>,
  swap:       (p) => <Icon {...p}><path d="M7 4 3 8l4 4" /><path d="M3 8h14a4 4 0 0 1 0 8h-2" /><path d="m17 20 4-4-4-4" /></Icon>,
  link:       (p) => <Icon {...p}><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></Icon>,
  clock:      (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>,
  lock:       (p) => <Icon {...p}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 1 1 8 0v4" /></Icon>,
  key:        (p) => <Icon {...p}><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9 3 3-3 3-2-2-2 2-2-2-3 3" /></Icon>,
  zap:        (p) => <Icon {...p}><path d="M13 3 4 14h7l-2 7 10-11h-7l1-7Z" /></Icon>,
  trend:      (p) => <Icon {...p}><path d="m3 17 6-6 4 4 8-9" /><path d="M14 6h7v7" /></Icon>,
  branch:     (p) => <Icon {...p}><circle cx="6" cy="5" r="2" /><circle cx="18" cy="5" r="2" /><circle cx="12" cy="19" r="2" /><path d="M6 7v4a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7M12 14v3" /></Icon>,
};

window.I = I;
window.Icon = Icon;
