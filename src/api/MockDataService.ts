import type { DataService, CreateUserInput, CreatePatientInput } from './DataService';
import {
  type User,
  type Patient,
  type PatientWidget,
  type WidgetPermission,
  type WidgetConfig,
  type AuditLogEntry,
  type RoleDefinition,
  Role,
  WidgetType,
  BUILT_IN_ROLES,
} from '../types';

// Simple hash comparison for mock — in production use bcrypt/argon2
function checkPassword(plain: string, hash: string): boolean {
  return hash === `mock_hash_${plain}`;
}

function mockHash(plain: string): string {
  return `mock_hash_${plain}`;
}

// ─── Seed Data ───────────────────────────────────────────────

interface UserWithPassword extends User {
  _passwordHash: string;
}

const USERS: UserWithPassword[] = [
  { id: 'u0', name: 'מנהל מערכת', username: 'admin', _passwordHash: mockHash('1234'), role: Role.Admin },
  { id: 'u2', name: 'ד"ר דוד לוי', username: 'david', _passwordHash: mockHash('1234'), role: Role.Doctor },
  { id: 'u3', name: 'נועה מזרחי', username: 'noa', _passwordHash: mockHash('1234'), role: Role.Nurse },
  { id: 'u4', name: 'יוסי בן-ארי', username: 'yossi', _passwordHash: mockHash('1234'), role: Role.Caregiver },
];

const PATIENTS: Patient[] = [
  { id: 'p1', fullName: 'הלית אילת', idNumber: '13695739', photoUrl: 'https://i.pravatar.cc/150?u=13695739', group: 'אגף מש"ה', dateOfBirth: '1976-03-23', gender: 'female' },
  { id: 'p2', fullName: 'אברהם אבו-ורדה', idNumber: '54335484', photoUrl: 'https://i.pravatar.cc/150?u=54335484', group: 'אגף מש"ה', dateOfBirth: '1956-07-21', gender: 'male' },
  { id: 'p3', fullName: 'יצחק יוס אבוטבול', idNumber: '55558316', photoUrl: 'https://i.pravatar.cc/150?u=55558316', group: 'אגף מש"ה', dateOfBirth: '1958-10-13', gender: 'male' },
  { id: 'p4', fullName: 'יעקב ארנד', idNumber: '56354186', photoUrl: 'https://i.pravatar.cc/150?u=56354186', group: 'אגף מש"ה', dateOfBirth: '1960-04-07', gender: 'male' },
  { id: 'p5', fullName: 'אלי אלבז', idNumber: '68431212', photoUrl: 'https://i.pravatar.cc/150?u=68431212', group: 'שיקום ונכים', dateOfBirth: '1961-04-01', gender: 'male' },
  { id: 'p6', fullName: 'עמרם אוחנה', idNumber: '69238384', photoUrl: 'https://i.pravatar.cc/150?u=69238384', group: 'אגף מש"ה', dateOfBirth: '1958-10-07', gender: 'male' },
  { id: 'p7', fullName: 'יוסף יחז אבידן', idNumber: '206733131', photoUrl: 'https://i.pravatar.cc/150?u=206733131', group: 'אגף מש"ה', dateOfBirth: '1998-04-23', gender: 'male' },
  { id: 'p8', fullName: 'אנטון ארונוביץ\'', idNumber: '310100128', photoUrl: 'https://i.pravatar.cc/150?u=310100128', group: 'אגף מש"ה', dateOfBirth: '1990-03-13', gender: 'male' },
  { id: 'p9', fullName: 'דניאל אהרן', idNumber: '318843042', photoUrl: 'https://i.pravatar.cc/150?u=318843042', group: 'אוטיסטים', dateOfBirth: '1999-08-21', gender: 'male' },
  { id: 'p10', fullName: 'מיכאל אהרונוב', idNumber: '317564201', photoUrl: 'https://i.pravatar.cc/150?u=317564201', group: 'אגף מש"ה', dateOfBirth: '1942-04-23', gender: 'male' },
  { id: 'p11', fullName: 'אסתר אדרי', idNumber: '301160420', photoUrl: 'https://i.pravatar.cc/150?u=301160420', group: 'אגף מש"ה', dateOfBirth: '1987-09-02', gender: 'female' },
  { id: 'p12', fullName: 'אהובה בן איאב', idNumber: '31914757', photoUrl: 'https://i.pravatar.cc/150?u=31914757', group: 'אגף מש"ה', dateOfBirth: '1975-04-09', gender: 'female' },
  { id: 'p13', fullName: 'מרסל ברדע', idNumber: '28967909', photoUrl: 'https://i.pravatar.cc/150?u=28967909', group: 'אגף מש"ה', dateOfBirth: '1972-02-03', gender: 'female' },
  { id: 'p14', fullName: 'נועה בכבוד', idNumber: '39824792', photoUrl: 'https://i.pravatar.cc/150?u=39824792', group: 'אגף מש"ה', dateOfBirth: '1984-06-06', gender: 'female' },
  { id: 'p15', fullName: 'אורית ברכה', idNumber: '208066688', photoUrl: 'https://i.pravatar.cc/150?u=208066688', group: 'אגף מש"ה', dateOfBirth: '1998-12-14', gender: 'female' },
  { id: 'p16', fullName: 'סיסאי בקלו', idNumber: '213273584', photoUrl: 'https://i.pravatar.cc/150?u=213273584', group: 'שיקום ונכים', dateOfBirth: '2004-04-01', gender: 'male' },
  { id: 'p17', fullName: 'לאה ביטרספלד', idNumber: '308512797', photoUrl: 'https://i.pravatar.cc/150?u=308512797', group: 'אגף מש"ה', dateOfBirth: '1992-12-22', gender: 'female' },
  { id: 'p18', fullName: 'אליצור ש בייטמן', idNumber: '320517014', photoUrl: 'https://i.pravatar.cc/150?u=320517014', group: 'שיקום ונכים', dateOfBirth: '1982-06-01', gender: 'male' },
  { id: 'p19', fullName: 'רחל ביבס', idNumber: '327532016', photoUrl: 'https://i.pravatar.cc/150?u=327532016', group: 'שיקום ונכים', dateOfBirth: '2004-11-20', gender: 'female' },
  { id: 'p20', fullName: 'יקיר גבי', idNumber: '315448753', photoUrl: 'https://i.pravatar.cc/150?u=315448753', group: 'אגף מש"ה', dateOfBirth: '1996-12-28', gender: 'male' },
  { id: 'p21', fullName: 'אביב גלבוע', idNumber: '36904704', photoUrl: 'https://i.pravatar.cc/150?u=36904704', group: 'אגף מש"ה', dateOfBirth: '1985-04-03', gender: 'male' },
  { id: 'p22', fullName: 'כוכב דגני', idNumber: '59271072', photoUrl: 'https://i.pravatar.cc/150?u=59271072', group: 'אגף מש"ה', dateOfBirth: '1965-04-14', gender: 'male' },
  { id: 'p23', fullName: 'מתתיהו דויטש', idNumber: '57827107', photoUrl: 'https://i.pravatar.cc/150?u=57827107', group: 'אגף מש"ה', dateOfBirth: '1962-08-25', gender: 'male' },
  { id: 'p24', fullName: 'סימון דנינו', idNumber: '68434752', photoUrl: 'https://i.pravatar.cc/150?u=68434752', group: 'אגף מש"ה', dateOfBirth: '1962-04-01', gender: 'male' },
  { id: 'p25', fullName: 'טובה גיט הקשר', idNumber: '312598444', photoUrl: 'https://i.pravatar.cc/150?u=312598444', group: 'שיקום ונכים', dateOfBirth: '1993-12-09', gender: 'female' },
  { id: 'p26', fullName: 'דנה ויגנר', idNumber: '318353018', photoUrl: 'https://i.pravatar.cc/150?u=318353018', group: 'אגף מש"ה', dateOfBirth: '1997-07-27', gender: 'female' },
  { id: 'p27', fullName: 'אשר מסעו זגורי', idNumber: '32806770', photoUrl: 'https://i.pravatar.cc/150?u=32806770', group: 'אגף מש"ה', dateOfBirth: '1978-07-30', gender: 'male' },
  { id: 'p28', fullName: 'מאיה זיסליס', idNumber: '316814672', photoUrl: 'https://i.pravatar.cc/150?u=316814672', group: 'אגף מש"ה', dateOfBirth: '1967-09-27', gender: 'female' },
  { id: 'p29', fullName: 'מיכאל ני חזיזא', idNumber: '301129433', photoUrl: 'https://i.pravatar.cc/150?u=301129433', group: 'אגף מש"ה', dateOfBirth: '1987-12-08', gender: 'male' },
  { id: 'p30', fullName: 'רן חבס', idNumber: '301772547', photoUrl: 'https://i.pravatar.cc/150?u=301772547', group: 'אגף מש"ה', dateOfBirth: '1988-11-18', gender: 'male' },
  { id: 'p31', fullName: 'אבשלום מ חזן', idNumber: '58897687', photoUrl: 'https://i.pravatar.cc/150?u=58897687', group: 'אגף מש"ה', dateOfBirth: '1964-12-11', gender: 'male' },
  { id: 'p32', fullName: 'חמיסה חדד', idNumber: '14694988', photoUrl: 'https://i.pravatar.cc/150?u=14694988', group: 'אגף מש"ה', dateOfBirth: '1939-05-01', gender: 'female' },
  { id: 'p33', fullName: 'חגית חלוואיה', idNumber: '31888886', photoUrl: 'https://i.pravatar.cc/150?u=31888886', group: 'אגף מש"ה', dateOfBirth: '1974-10-17', gender: 'female' },
  { id: 'p34', fullName: 'שרון טאבו', idNumber: '27321942', photoUrl: 'https://i.pravatar.cc/150?u=27321942', group: 'אגף מש"ה', dateOfBirth: '1974-08-17', gender: 'male' },
  { id: 'p35', fullName: 'מיכל יעקב', idNumber: '43013515', photoUrl: 'https://i.pravatar.cc/150?u=43013515', group: 'שיקום ונכים', dateOfBirth: '1981-03-09', gender: 'female' },
  { id: 'p36', fullName: 'דן יעקובס', idNumber: '53084380', photoUrl: 'https://i.pravatar.cc/150?u=53084380', group: 'אגף מש"ה', dateOfBirth: '1982-01-28', gender: 'male' },
  { id: 'p37', fullName: 'נסים יהושע', idNumber: '59792572', photoUrl: 'https://i.pravatar.cc/150?u=59792572', group: 'אגף מש"ה', dateOfBirth: '1967-05-25', gender: 'male' },
  { id: 'p38', fullName: 'אסטריקה יעקובזון', idNumber: '69251577', photoUrl: 'https://i.pravatar.cc/150?u=69251577', group: 'אגף מש"ה', dateOfBirth: '1934-07-18', gender: 'female' },
  { id: 'p39', fullName: 'ששון כהן', idNumber: '29511383', photoUrl: 'https://i.pravatar.cc/150?u=29511383', group: 'אגף מש"ה', dateOfBirth: '1972-08-24', gender: 'male' },
  { id: 'p40', fullName: 'מורן חי כהן', idNumber: '32074163', photoUrl: 'https://i.pravatar.cc/150?u=32074163', group: 'אגף מש"ה', dateOfBirth: '1974-12-24', gender: 'male' },
  { id: 'p41', fullName: 'יואב כהן', idNumber: '40649238', photoUrl: 'https://i.pravatar.cc/150?u=40649238', group: 'אגף מש"ה', dateOfBirth: '1981-07-05', gender: 'male' },
  { id: 'p42', fullName: 'אביבה כהן', idNumber: '57227951', photoUrl: 'https://i.pravatar.cc/150?u=57227951', group: 'אגף מש"ה', dateOfBirth: '1961-08-09', gender: 'female' },
  { id: 'p43', fullName: 'כרם כהן', idNumber: '207193756', photoUrl: 'https://i.pravatar.cc/150?u=207193756', group: 'אגף מש"ה', dateOfBirth: '1999-05-16', gender: 'female' },
  { id: 'p44', fullName: 'יהבית כהן', idNumber: '302915962', photoUrl: 'https://i.pravatar.cc/150?u=302915962', group: 'שיקום ונכים', dateOfBirth: '1990-01-22', gender: 'female' },
  { id: 'p45', fullName: 'חן כהן', idNumber: '208892901', photoUrl: 'https://i.pravatar.cc/150?u=208892901', group: 'אגף מש"ה', dateOfBirth: '1997-01-03', gender: 'female' },
  { id: 'p46', fullName: 'שוקי כדר', idNumber: '33477209', photoUrl: 'https://i.pravatar.cc/150?u=33477209', group: 'אגף מש"ה', dateOfBirth: '1976-12-03', gender: 'male' },
  { id: 'p47', fullName: 'חנה לוי', idNumber: '209771294', photoUrl: 'https://i.pravatar.cc/150?u=209771294', group: 'אוטיסטים', dateOfBirth: '2001-04-22', gender: 'female' },
  { id: 'p48', fullName: 'אלמוג לוי', idNumber: '311215941', photoUrl: 'https://i.pravatar.cc/150?u=311215941', group: 'אגף מש"ה', dateOfBirth: '1993-08-08', gender: 'female' },
  { id: 'p49', fullName: 'טלי לוי', idNumber: '329197479', photoUrl: 'https://i.pravatar.cc/150?u=329197479', group: 'אגף מש"ה', dateOfBirth: '2005-12-08', gender: 'female' },
  { id: 'p50', fullName: 'אורלי ללוש', idNumber: '22108039', photoUrl: 'https://i.pravatar.cc/150?u=22108039', group: 'אגף מש"ה', dateOfBirth: '1965-12-01', gender: 'female' },
  { id: 'p51', fullName: 'מרק לייזר', idNumber: '306626177', photoUrl: 'https://i.pravatar.cc/150?u=306626177', group: 'שיקום ונכים', dateOfBirth: '1966-11-28', gender: 'male' },
  { id: 'p52', fullName: 'ששון מועלם', idNumber: '56837982', photoUrl: 'https://i.pravatar.cc/150?u=56837982', group: 'אגף מש"ה', dateOfBirth: '1966-11-29', gender: 'male' },
  { id: 'p53', fullName: 'דליה מורד', idNumber: '52135308', photoUrl: 'https://i.pravatar.cc/150?u=52135308', group: 'אגף מש"ה', dateOfBirth: '1953-12-12', gender: 'female' },
  { id: 'p54', fullName: 'ליאת מוזס', idNumber: '35982941', photoUrl: 'https://i.pravatar.cc/150?u=35982941', group: 'אגף מש"ה', dateOfBirth: '1979-08-15', gender: 'female' },
  { id: 'p55', fullName: 'אלכסנדר מרשטיין', idNumber: '213892425', photoUrl: 'https://i.pravatar.cc/150?u=213892425', group: 'שיקום ונכים', dateOfBirth: '2003-05-10', gender: 'male' },
  { id: 'p56', fullName: 'יגאל מנטש', idNumber: '29066529', photoUrl: 'https://i.pravatar.cc/150?u=29066529', group: 'אגף מש"ה', dateOfBirth: '1972-01-08', gender: 'male' },
  { id: 'p57', fullName: 'סגולה מחפוד', idNumber: '3959467', photoUrl: 'https://i.pravatar.cc/150?u=3959467', group: 'אגף מש"ה', dateOfBirth: '1946-04-01', gender: 'female' },
  { id: 'p58', fullName: 'יעקב יצח מימון', idNumber: '201458569', photoUrl: 'https://i.pravatar.cc/150?u=201458569', group: 'אגף מש"ה', dateOfBirth: '1989-01-30', gender: 'male' },
  { id: 'p59', fullName: 'חננאל מולאי', idNumber: '313565582', photoUrl: 'https://i.pravatar.cc/150?u=313565582', group: 'אוטיסטים', dateOfBirth: '1995-01-02', gender: 'male' },
  { id: 'p60', fullName: 'דמיטרי מקסימצ\'ב', idNumber: '324786771', photoUrl: 'https://i.pravatar.cc/150?u=324786771', group: 'אגף מש"ה', dateOfBirth: '1996-07-26', gender: 'male' },
  { id: 'p61', fullName: 'אוראל מזרחי', idNumber: '326082526', photoUrl: 'https://i.pravatar.cc/150?u=326082526', group: 'לא ידוע', dateOfBirth: '2004-06-03', gender: 'male' },
  { id: 'p62', fullName: 'אורית מידן', idNumber: '34200675', photoUrl: 'https://i.pravatar.cc/150?u=34200675', group: 'אגף מש"ה', dateOfBirth: '1977-12-13', gender: 'female' },
  { id: 'p63', fullName: 'אושר מיק', idNumber: '213355696', photoUrl: 'https://i.pravatar.cc/150?u=213355696', group: 'לא ידוע', dateOfBirth: '2003-02-26', gender: 'male' },
  { id: 'p64', fullName: 'בנימין א מור', idNumber: '207744129', photoUrl: 'https://i.pravatar.cc/150?u=207744129', group: 'אגף מש"ה', dateOfBirth: '1998-05-07', gender: 'male' },
  { id: 'p65', fullName: 'אייל מזרחי', idNumber: '25558693', photoUrl: 'https://i.pravatar.cc/150?u=25558693', group: 'שיקום ונכים', dateOfBirth: '1974-02-08', gender: 'male' },
  { id: 'p66', fullName: 'גלינה נוסלוב', idNumber: '304420722', photoUrl: 'https://i.pravatar.cc/150?u=304420722', group: 'לא ידוע', dateOfBirth: '1970-01-01', gender: 'female' },
  { id: 'p67', fullName: 'מאור סהלו', idNumber: '211782487', photoUrl: 'https://i.pravatar.cc/150?u=211782487', group: 'אגף מש"ה', dateOfBirth: '2001-01-26', gender: 'male' },
  { id: 'p68', fullName: 'רבקה ספרדי', idNumber: '56486913', photoUrl: 'https://i.pravatar.cc/150?u=56486913', group: 'אגף מש"ה', dateOfBirth: '1960-06-02', gender: 'female' },
  { id: 'p69', fullName: 'וסטינה סטנקביץ\'', idNumber: '311771760', photoUrl: 'https://i.pravatar.cc/150?u=311771760', group: 'אגף מש"ה', dateOfBirth: '1983-01-24', gender: 'female' },
  { id: 'p70', fullName: 'רוסטיסלב סרבריאקוב', idNumber: '332504596', photoUrl: 'https://i.pravatar.cc/150?u=332504596', group: 'אגף מש"ה', dateOfBirth: '1989-11-13', gender: 'male' },
  { id: 'p71', fullName: 'יצחק עבוד', idNumber: '32508822', photoUrl: 'https://i.pravatar.cc/150?u=32508822', group: 'אגף מש"ה', dateOfBirth: '1986-07-24', gender: 'male' },
  { id: 'p72', fullName: 'רוברט פדידה', idNumber: '69907285', photoUrl: 'https://i.pravatar.cc/150?u=69907285', group: 'אגף מש"ה', dateOfBirth: '1963-10-19', gender: 'male' },
  { id: 'p73', fullName: 'קוטי פונטה', idNumber: '69966414', photoUrl: 'https://i.pravatar.cc/150?u=69966414', group: 'אגף מש"ה', dateOfBirth: '1956-07-01', gender: 'female' },
  { id: 'p74', fullName: 'זיו חיים פדידה', idNumber: '324115765', photoUrl: 'https://i.pravatar.cc/150?u=324115765', group: 'אגף מש"ה', dateOfBirth: '2001-10-03', gender: 'male' },
  { id: 'p75', fullName: 'בוריס פינקלשטיין', idNumber: '307521534', photoUrl: 'https://i.pravatar.cc/150?u=307521534', group: 'אגף מש"ה', dateOfBirth: '1958-01-31', gender: 'male' },
  { id: 'p76', fullName: 'דמיטרי פלנט', idNumber: '345666192', photoUrl: 'https://i.pravatar.cc/150?u=345666192', group: 'אגף מש"ה', dateOfBirth: '1971-10-05', gender: 'male' },
  { id: 'p77', fullName: 'אלישבע פרידמן', idNumber: '55048144', photoUrl: 'https://i.pravatar.cc/150?u=55048144', group: 'שיקום ונכים', dateOfBirth: '1958-04-05', gender: 'female' },
  { id: 'p78', fullName: 'שמואל קדוש', idNumber: '36295475', photoUrl: 'https://i.pravatar.cc/150?u=36295475', group: 'אגף מש"ה', dateOfBirth: '1979-04-15', gender: 'male' },
  { id: 'p79', fullName: 'ילנה קרביץ', idNumber: '305846842', photoUrl: 'https://i.pravatar.cc/150?u=305846842', group: 'אגף מש"ה', dateOfBirth: '1978-10-11', gender: 'female' },
  { id: 'p80', fullName: 'אדוארד קורנקוב', idNumber: '316878156', photoUrl: 'https://i.pravatar.cc/150?u=316878156', group: 'אגף מש"ה', dateOfBirth: '1946-08-06', gender: 'male' },
  { id: 'p81', fullName: 'ילנה קוסטיוקביץ\'', idNumber: '317423705', photoUrl: 'https://i.pravatar.cc/150?u=317423705', group: 'שיקום ונכים', dateOfBirth: '1981-03-27', gender: 'female' },
  { id: 'p82', fullName: 'יגור קונביסר', idNumber: '329041461', photoUrl: 'https://i.pravatar.cc/150?u=329041461', group: 'אגף מש"ה', dateOfBirth: '1967-10-03', gender: 'male' },
  { id: 'p83', fullName: 'יוסי ראובן', idNumber: '58689720', photoUrl: 'https://i.pravatar.cc/150?u=58689720', group: 'אגף מש"ה', dateOfBirth: '1964-02-18', gender: 'male' },
  { id: 'p84', fullName: 'מיכאל רוטמן', idNumber: '318668969', photoUrl: 'https://i.pravatar.cc/150?u=318668969', group: 'אגף מש"ה', dateOfBirth: '1997-09-09', gender: 'male' },
  { id: 'p85', fullName: 'שלומי רביבו', idNumber: '40146185', photoUrl: 'https://i.pravatar.cc/150?u=40146185', group: 'אגף מש"ה', dateOfBirth: '1980-06-19', gender: 'male' },
  { id: 'p86', fullName: 'אלקן שמעון', idNumber: '65783763', photoUrl: 'https://i.pravatar.cc/150?u=65783763', group: 'אגף מש"ה', dateOfBirth: '1958-08-18', gender: 'male' },
  { id: 'p87', fullName: 'אברהם שרם', idNumber: '59733345', photoUrl: 'https://i.pravatar.cc/150?u=59733345', group: 'שיקום ונכים', dateOfBirth: '1966-12-31', gender: 'male' },
  { id: 'p88', fullName: 'דורון שרעבי', idNumber: '23572183', photoUrl: 'https://i.pravatar.cc/150?u=23572183', group: 'אגף מש"ה', dateOfBirth: '1967-12-01', gender: 'male' },
  { id: 'p89', fullName: 'ורדה שפירא', idNumber: '50835669', photoUrl: 'https://i.pravatar.cc/150?u=50835669', group: 'אגף מש"ה', dateOfBirth: '1951-08-19', gender: 'female' },
  { id: 'p90', fullName: 'חביבה שבירו', idNumber: '52040060', photoUrl: 'https://i.pravatar.cc/150?u=52040060', group: 'אגף מש"ה', dateOfBirth: '1954-07-06', gender: 'female' },
  { id: 'p91', fullName: 'יהודה אש שני', idNumber: '212072763', photoUrl: 'https://i.pravatar.cc/150?u=212072763', group: 'אגף מש"ה', dateOfBirth: '2001-12-08', gender: 'male' },
  { id: 'p92', fullName: 'מרק שפירו', idNumber: '313095788', photoUrl: 'https://i.pravatar.cc/150?u=313095788', group: 'אגף מש"ה', dateOfBirth: '1956-05-13', gender: 'male' },
  { id: 'p93', fullName: 'ברוך שכטר', idNumber: '038014502', photoUrl: 'https://i.pravatar.cc/150?u=038014502', group: 'לא ידוע', dateOfBirth: '1970-01-01', gender: 'male' },
  { id: 'p94', fullName: 'גילה שוורץ', idNumber: '39199419', photoUrl: 'https://i.pravatar.cc/150?u=39199419', group: 'משרד הבריאות', dateOfBirth: '1970-01-01', gender: 'female' },
  { id: 'p95', fullName: 'סיגלית גוטמן', idNumber: '308422336', photoUrl: 'https://i.pravatar.cc/150?u=308422336', group: 'משרד הבריאות', dateOfBirth: '1970-01-01', gender: 'female' },
  { id: 'p96', fullName: 'שמעון בוהדנה', idNumber: '315550443', photoUrl: 'https://i.pravatar.cc/150?u=315550443', group: 'משרד הבריאות', dateOfBirth: '1970-01-01', gender: 'male' },
  { id: 'p97', fullName: 'מעיין ריקין', idNumber: '312249774', photoUrl: 'https://i.pravatar.cc/150?u=312249774', group: 'משרד הבריאות', dateOfBirth: '1970-01-01', gender: 'female' },
  { id: 'p98', fullName: 'שירה קאופמן', idNumber: '206106189', photoUrl: 'https://i.pravatar.cc/150?u=206106189', group: 'משרד הבריאות', dateOfBirth: '1970-01-01', gender: 'female' },
];

const WIDGETS: PatientWidget[] = PATIENTS.flatMap((p) => [
  { id: `${p.id}_food`, patientId: p.id, widgetType: WidgetType.FoodTexture, value: 'רגיל', lastUpdated: '2026-03-01', updatedBy: 'u2' },
  { id: `${p.id}_walk`, patientId: p.id, widgetType: WidgetType.WalkingStability, value: 'יציב — ללא צורך בליווי', lastUpdated: '2026-03-01', updatedBy: 'u2' },
  { id: `${p.id}_risk`, patientId: p.id, widgetType: WidgetType.RiskManagement, value: 'ללא סיכונים מיוחדים', lastUpdated: '2026-03-01', updatedBy: 'u0' },
  { id: `${p.id}_guardian`, patientId: p.id, widgetType: WidgetType.GuardianDetails, value: 'לא מונה אפוטרופוס', lastUpdated: '2026-03-01', updatedBy: 'u3' },
  { id: `${p.id}_meds`, patientId: p.id, widgetType: WidgetType.MedicationCardex, value: 'אין תרופות פעילות', lastUpdated: '2026-03-01', updatedBy: 'u2' },
  { id: `${p.id}_sens`, patientId: p.id, widgetType: WidgetType.Sensitivities, value: 'לא ידועות', lastUpdated: '2026-03-01', updatedBy: 'u2' },
  { id: `${p.id}_diag`, patientId: p.id, widgetType: WidgetType.MedicalDiagnoses, value: 'אין אבחנות', lastUpdated: '2026-03-01', updatedBy: 'u2' },
  { id: `${p.id}_dev`, patientId: p.id, widgetType: WidgetType.PersonalDevelopment, value: 'תוכנית בסיסית', lastUpdated: '2026-03-01', updatedBy: 'u3' },
  { id: `${p.id}_events`, patientId: p.id, widgetType: WidgetType.ExceptionalEvents, value: 'אין אירועים', lastUpdated: '2026-03-01', updatedBy: 'u3' },
]);

const PERMISSIONS: WidgetPermission[] = [
  { widgetType: WidgetType.FoodTexture, rolesAllowedToEdit: [Role.Doctor, Role.Dietitian, Role.Nurse, Role.HeadNurse, Role.Admin] },
  { widgetType: WidgetType.WalkingStability, rolesAllowedToEdit: [Role.Doctor, Role.Physiotherapist, Role.OccupationalTherapist, Role.Nurse, Role.HeadNurse, Role.Admin] },
  { widgetType: WidgetType.RiskManagement, rolesAllowedToEdit: [Role.Doctor, Role.Psychiatrist, Role.HeadNurse, Role.SocialWorker, Role.Admin] },
  { widgetType: WidgetType.GuardianDetails, rolesAllowedToEdit: [Role.SocialWorker, Role.HeadNurse, Role.Admin] },
  { widgetType: WidgetType.MedicationCardex, rolesAllowedToEdit: [Role.Doctor, Role.Psychiatrist, Role.Nurse, Role.HeadNurse, Role.Admin] },
  { widgetType: WidgetType.Sensitivities, rolesAllowedToEdit: [Role.Doctor, Role.Nurse, Role.HeadNurse, Role.Admin] },
  { widgetType: WidgetType.MedicalDiagnoses, rolesAllowedToEdit: [Role.Doctor, Role.Psychiatrist, Role.Admin] },
  { widgetType: WidgetType.PersonalDevelopment, rolesAllowedToEdit: [Role.DevelopmentCoordinator, Role.EducationCoordinator, Role.SocialWorker, Role.Admin] },
  { widgetType: WidgetType.ExceptionalEvents, rolesAllowedToEdit: [Role.Caregiver, Role.Nurse, Role.HeadNurse, Role.SocialWorker, Role.Admin] },
];

const WIDGET_CONFIGS: WidgetConfig[] = [
  { widgetType: WidgetType.FoodTexture, inputType: 'select', options: ['רגיל', 'רך', 'מרוסק', 'נוזלי', 'מעובה'] },
  { widgetType: WidgetType.WalkingStability, inputType: 'select', options: ['יציב — ללא צורך בליווי', 'זקוק לליווי', 'זקוק לעזרה מכנית', 'על כיסא גלגלים', 'מרותק למיטה'] },
  { widgetType: WidgetType.RiskManagement, inputType: 'freetext', options: [] },
  { widgetType: WidgetType.GuardianDetails, inputType: 'freetext', options: [] },
  { widgetType: WidgetType.MedicationCardex, inputType: 'freetext', options: [] },
  { widgetType: WidgetType.Sensitivities, inputType: 'freetext', options: [] },
  { widgetType: WidgetType.MedicalDiagnoses, inputType: 'freetext', options: [] },
  { widgetType: WidgetType.PersonalDevelopment, inputType: 'freetext', options: [] },
  { widgetType: WidgetType.ExceptionalEvents, inputType: 'freetext', options: [] },
];

// ─── Mock Implementation ─────────────────────────────────────

export class MockDataService implements DataService {
  private users: UserWithPassword[] = [...USERS];
  private patients = [...PATIENTS];
  private widgets = [...WIDGETS];
  private permissions = [...PERMISSIONS];
  private widgetConfigs = WIDGET_CONFIGS.map((c) => ({ ...c, options: [...c.options] }));
  private auditLog: AuditLogEntry[] = [];
  private roles: RoleDefinition[] = [...BUILT_IN_ROLES];

  async login(username: string, password: string): Promise<User | null> {
    const user = this.users.find((u) => u.username === username);
    if (!user || !checkPassword(password, user._passwordHash)) return null;
    const { _passwordHash: _, ...userWithoutHash } = user;
    return userWithoutHash;
  }

  async getCurrentSession(): Promise<User | null> {
    return null;
  }

  async logout(): Promise<void> {
    // no-op for mock
  }

  async getUserById(id: string): Promise<User | null> {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    const { _passwordHash: _, ...userWithoutHash } = user;
    return userWithoutHash;
  }

  async searchPatients(query: string): Promise<Patient[]> {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return this.patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.idNumber.includes(q),
    );
  }

  async getPatientById(id: string): Promise<Patient | null> {
    return this.patients.find((p) => p.id === id) ?? null;
  }

  async getWidgetsForPatient(patientId: string): Promise<PatientWidget[]> {
    return this.widgets.filter((w) => w.patientId === patientId);
  }

  async updateWidget(
    widgetId: string,
    newValue: string,
    userId: string,
  ): Promise<PatientWidget> {
    const idx = this.widgets.findIndex((w) => w.id === widgetId);
    if (idx === -1) throw new Error('Widget not found');

    const widget = this.widgets[idx];
    const oldValue = widget.value;

    // Permission check
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error('User not found');
    const perm = this.permissions.find((p) => p.widgetType === widget.widgetType);
    if (!perm || !perm.rolesAllowedToEdit.includes(user.role)) {
      throw new Error('Permission denied');
    }

    const updated: PatientWidget = {
      ...widget,
      value: newValue,
      lastUpdated: new Date().toISOString(),
      updatedBy: userId,
    };
    this.widgets[idx] = updated;

    // Audit log
    this.auditLog.push({
      id: `audit_${Date.now()}`,
      userId,
      patientId: widget.patientId,
      widgetType: widget.widgetType,
      oldValue,
      newValue,
      timestamp: new Date().toISOString(),
    });

    return { ...updated };
  }

  async getWidgetPermissions(): Promise<WidgetPermission[]> {
    return [...this.permissions];
  }

  async canEditWidget(widgetType: WidgetType, userRole: string): Promise<boolean> {
    const perm = this.permissions.find((p) => p.widgetType === widgetType);
    return perm ? perm.rolesAllowedToEdit.includes(userRole) : false;
  }

  async getAuditLog(patientId?: string): Promise<AuditLogEntry[]> {
    if (patientId) {
      return this.auditLog.filter((a) => a.patientId === patientId);
    }
    return [...this.auditLog];
  }

  // ─── Admin — Users ──────────────────────────────────────────

  async getAllUsers(): Promise<User[]> {
    return this.users.map(({ _passwordHash: _, ...u }) => u);
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const exists = this.users.find((u) => u.username === input.username);
    if (exists) throw new Error('שם המשתמש כבר קיים');

    const user: UserWithPassword = {
      id: `u_${Date.now()}`,
      name: input.name,
      username: input.username,
      _passwordHash: mockHash(input.password),
      role: input.role,
    };
    this.users.push(user);
    const { _passwordHash: _, ...userWithoutHash } = user;
    return userWithoutHash;
  }

  async updateUser(id: string, updates: Partial<CreateUserInput>): Promise<User> {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('משתמש לא נמצא');

    if (updates.username) {
      const dup = this.users.find((u) => u.username === updates.username && u.id !== id);
      if (dup) throw new Error('שם המשתמש כבר קיים');
    }

    const user = this.users[idx];
    this.users[idx] = {
      ...user,
      name: updates.name ?? user.name,
      username: updates.username ?? user.username,
      _passwordHash: updates.password ? mockHash(updates.password) : user._passwordHash,
      role: updates.role ?? user.role,
    };
    const { _passwordHash: _, ...userWithoutHash } = this.users[idx];
    return userWithoutHash;
  }

  async deleteUser(id: string): Promise<void> {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('משתמש לא נמצא');
    this.users.splice(idx, 1);
  }

  // ─── Admin — Patients ───────────────────────────────────────

  async getAllPatients(): Promise<Patient[]> {
    return [...this.patients];
  }

  async createPatient(input: CreatePatientInput): Promise<Patient> {
    const exists = this.patients.find((p) => p.idNumber === input.idNumber);
    if (exists) throw new Error('מספר ת.ז כבר קיים במערכת');

    const patient: Patient = {
      id: `p_${Date.now()}`,
      ...input,
    };
    this.patients.push(patient);

    // Create default widgets for the new patient
    const defaultWidgets: PatientWidget[] = Object.values(WidgetType).map((wt) => ({
      id: `${patient.id}_${wt}`,
      patientId: patient.id,
      widgetType: wt,
      value: '',
      lastUpdated: new Date().toISOString(),
      updatedBy: '',
    }));
    this.widgets.push(...defaultWidgets);

    return { ...patient };
  }

  // ─── Admin — Permissions ────────────────────────────────────

  async updateWidgetPermissions(widgetType: WidgetType, rolesAllowedToEdit: string[]): Promise<WidgetPermission> {
    const idx = this.permissions.findIndex((p) => p.widgetType === widgetType);
    if (idx === -1) throw new Error('סוג ווידג\'ט לא נמצא');

    this.permissions[idx] = { widgetType, rolesAllowedToEdit };
    return { ...this.permissions[idx] };
  }

  // ─── Admin — Roles ──────────────────────────────────────────

  async getAllRoles(): Promise<RoleDefinition[]> {
    return [...this.roles];
  }

  async createRole(id: string, label: string): Promise<RoleDefinition> {
    const exists = this.roles.find((r) => r.id === id);
    if (exists) throw new Error('מזהה התפקיד כבר קיים');

    const role: RoleDefinition = { id, label, isBuiltIn: false };
    this.roles.push(role);
    return { ...role };
  }

  async deleteRole(id: string): Promise<void> {
    const role = this.roles.find((r) => r.id === id);
    if (!role) throw new Error('תפקיד לא נמצא');
    if (role.isBuiltIn) throw new Error('לא ניתן למחוק תפקיד מובנה');

    // Remove role from all permissions
    for (const perm of this.permissions) {
      perm.rolesAllowedToEdit = perm.rolesAllowedToEdit.filter((r) => r !== id);
    }

    // Clear role from users who have it
    for (const user of this.users) {
      if (user.role === id) {
        user.role = Role.Caregiver;
      }
    }

    this.roles = this.roles.filter((r) => r.id !== id);
  }

  // ─── Admin — Widget Config ──────────────────────────────────

  async getWidgetConfigs(): Promise<WidgetConfig[]> {
    return this.widgetConfigs.map((c) => ({ ...c, options: [...c.options] }));
  }

  async updateWidgetConfig(widgetType: WidgetType, inputType: 'freetext' | 'select', options: string[]): Promise<WidgetConfig> {
    const idx = this.widgetConfigs.findIndex((c) => c.widgetType === widgetType);
    if (idx === -1) throw new Error('סוג ווידג\'ט לא נמצא');

    this.widgetConfigs[idx] = { widgetType, inputType, options: [...options] };
    return { ...this.widgetConfigs[idx], options: [...options] };
  }

  async uploadPatientPhoto(patientId: string, file: File): Promise<string> {
    const url = URL.createObjectURL(file);
    const idx = this.patients.findIndex((p) => p.id === patientId);
    if (idx !== -1) this.patients[idx] = { ...this.patients[idx], photoUrl: url };
    return url;
  }
}
