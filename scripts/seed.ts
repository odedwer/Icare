/**
 * Seed script — populates DynamoDB via Amplify Gen2 with initial data.
 * Run after `amplify sandbox` has provisioned the backend:
 *
 *   npx tsx scripts/seed.ts
 */
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminDeleteUserCommand,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import type { Schema } from '../amplify/data/resource';
import outputs from '../amplify_outputs.json';

Amplify.configure(outputs);
const client = generateClient<Schema>();

// ─── Cognito setup ───────────────────────────────────────────

// The User Pool is created via raw CDK (bypassing defineAuth), so its ID is not in
// amplify_outputs.json. Read it from environment variables instead.
// Set VITE_USER_POOL_ID and VITE_USER_POOL_ID in .env.local (same vars used by the frontend).
const custom = (outputs as any).custom as { userPoolId?: string; region?: string } | undefined;
const userPoolId = (
  (outputs as any).auth?.user_pool_id as string | undefined ??
  custom?.userPoolId ??
  process.env.VITE_USER_POOL_ID
)?.trim();

if (!userPoolId) {
  throw new Error(
    'Could not find User Pool ID in amplify_outputs.json (.custom.userPoolId). ' +
    'Run the sandbox first, or set VITE_USER_POOL_ID in .env.local.',
  );
}

const region = (outputs as any).auth?.aws_region as string | undefined ?? custom?.region ?? 'us-east-1';
const cognitoClient = new CognitoIdentityProviderClient({ region });

// ─── Seed Data ───────────────────────────────────────────────

const USERS = [
  { name: 'שרה כהן',      username: 'sarah', password: 'Admin1234', role: 'admin' },
  { name: 'ד"ר דוד לוי',  username: 'david', password: 'Admin1234', role: 'doctor' },
  { name: 'נועה מזרחי',   username: 'noa',   password: 'Admin1234', role: 'nurse' },
  { name: 'יוסי בן-ארי',  username: 'yossi', password: 'Admin1234', role: 'caregiver' },
];

const PATIENTS = [
  { fullName: 'הלית אילת', idNumber: '13695739', photoUrl: 'https://i.pravatar.cc/150?u=13695739', group: 'אגף מש"ה', dateOfBirth: '1976-03-23', gender: 'female' },
  { fullName: 'אברהם אבו-ורדה', idNumber: '54335484', photoUrl: 'https://i.pravatar.cc/150?u=54335484', group: 'אגף מש"ה', dateOfBirth: '1956-07-21', gender: 'male' },
  { fullName: 'יצחק יוס אבוטבול', idNumber: '55558316', photoUrl: 'https://i.pravatar.cc/150?u=55558316', group: 'אגף מש"ה', dateOfBirth: '1958-10-13', gender: 'male' },
  { fullName: 'יעקב ארנד', idNumber: '56354186', photoUrl: 'https://i.pravatar.cc/150?u=56354186', group: 'אגף מש"ה', dateOfBirth: '1960-04-07', gender: 'male' },
  { fullName: 'אלי אלבז', idNumber: '68431212', photoUrl: 'https://i.pravatar.cc/150?u=68431212', group: 'שיקום ונכים', dateOfBirth: '1961-04-01', gender: 'male' },
  { fullName: 'עמרם אוחנה', idNumber: '69238384', photoUrl: 'https://i.pravatar.cc/150?u=69238384', group: 'אגף מש"ה', dateOfBirth: '1958-10-07', gender: 'male' },
  { fullName: 'יוסף יחז אבידן', idNumber: '206733131', photoUrl: 'https://i.pravatar.cc/150?u=206733131', group: 'אגף מש"ה', dateOfBirth: '1998-04-23', gender: 'male' },
  { fullName: 'אנטון ארונוביץ\'', idNumber: '310100128', photoUrl: 'https://i.pravatar.cc/150?u=310100128', group: 'אגף מש"ה', dateOfBirth: '1990-03-13', gender: 'male' },
  { fullName: 'דניאל אהרן', idNumber: '318843042', photoUrl: 'https://i.pravatar.cc/150?u=318843042', group: 'אוטיסטים', dateOfBirth: '1999-08-21', gender: 'male' },
  { fullName: 'מיכאל אהרונוב', idNumber: '317564201', photoUrl: 'https://i.pravatar.cc/150?u=317564201', group: 'אגף מש"ה', dateOfBirth: '1942-04-23', gender: 'male' },
  { fullName: 'אסתר אדרי', idNumber: '301160420', photoUrl: 'https://i.pravatar.cc/150?u=301160420', group: 'אגף מש"ה', dateOfBirth: '1987-09-02', gender: 'female' },
  { fullName: 'אהובה בן איאב', idNumber: '31914757', photoUrl: 'https://i.pravatar.cc/150?u=31914757', group: 'אגף מש"ה', dateOfBirth: '1975-04-09', gender: 'female' },
  { fullName: 'מרסל ברדע', idNumber: '28967909', photoUrl: 'https://i.pravatar.cc/150?u=28967909', group: 'אגף מש"ה', dateOfBirth: '1972-02-03', gender: 'female' },
  { fullName: 'נועה בכבוד', idNumber: '39824792', photoUrl: 'https://i.pravatar.cc/150?u=39824792', group: 'אגף מש"ה', dateOfBirth: '1984-06-06', gender: 'female' },
  { fullName: 'אורית ברכה', idNumber: '208066688', photoUrl: 'https://i.pravatar.cc/150?u=208066688', group: 'אגף מש"ה', dateOfBirth: '1998-12-14', gender: 'female' },
  { fullName: 'סיסאי בקלו', idNumber: '213273584', photoUrl: 'https://i.pravatar.cc/150?u=213273584', group: 'שיקום ונכים', dateOfBirth: '2004-04-01', gender: 'male' },
  { fullName: 'לאה ביטרספלד', idNumber: '308512797', photoUrl: 'https://i.pravatar.cc/150?u=308512797', group: 'אגף מש"ה', dateOfBirth: '1992-12-22', gender: 'female' },
  { fullName: 'אליצור ש בייטמן', idNumber: '320517014', photoUrl: 'https://i.pravatar.cc/150?u=320517014', group: 'שיקום ונכים', dateOfBirth: '1982-06-01', gender: 'male' },
  { fullName: 'רחל ביבס', idNumber: '327532016', photoUrl: 'https://i.pravatar.cc/150?u=327532016', group: 'שיקום ונכים', dateOfBirth: '2004-11-20', gender: 'female' },
  { fullName: 'יקיר גבי', idNumber: '315448753', photoUrl: 'https://i.pravatar.cc/150?u=315448753', group: 'אגף מש"ה', dateOfBirth: '1996-12-28', gender: 'male' },
  { fullName: 'אביב גלבוע', idNumber: '36904704', photoUrl: 'https://i.pravatar.cc/150?u=36904704', group: 'אגף מש"ה', dateOfBirth: '1985-04-03', gender: 'male' },
  { fullName: 'כוכב דגני', idNumber: '59271072', photoUrl: 'https://i.pravatar.cc/150?u=59271072', group: 'אגף מש"ה', dateOfBirth: '1965-04-14', gender: 'male' },
  { fullName: 'מתתיהו דויטש', idNumber: '57827107', photoUrl: 'https://i.pravatar.cc/150?u=57827107', group: 'אגף מש"ה', dateOfBirth: '1962-08-25', gender: 'male' },
  { fullName: 'סימון דנינו', idNumber: '68434752', photoUrl: 'https://i.pravatar.cc/150?u=68434752', group: 'אגף מש"ה', dateOfBirth: '1962-04-01', gender: 'male' },
  { fullName: 'טובה גיט הקשר', idNumber: '312598444', photoUrl: 'https://i.pravatar.cc/150?u=312598444', group: 'שיקום ונכים', dateOfBirth: '1993-12-09', gender: 'female' },
  { fullName: 'דנה ויגנר', idNumber: '318353018', photoUrl: 'https://i.pravatar.cc/150?u=318353018', group: 'אגף מש"ה', dateOfBirth: '1997-07-27', gender: 'female' },
  { fullName: 'אשר מסעו זגורי', idNumber: '32806770', photoUrl: 'https://i.pravatar.cc/150?u=32806770', group: 'אגף מש"ה', dateOfBirth: '1978-07-30', gender: 'male' },
  { fullName: 'מאיה זיסליס', idNumber: '316814672', photoUrl: 'https://i.pravatar.cc/150?u=316814672', group: 'אגף מש"ה', dateOfBirth: '1967-09-27', gender: 'female' },
  { fullName: 'מיכאל ני חזיזא', idNumber: '301129433', photoUrl: 'https://i.pravatar.cc/150?u=301129433', group: 'אגף מש"ה', dateOfBirth: '1987-12-08', gender: 'male' },
  { fullName: 'רן חבס', idNumber: '301772547', photoUrl: 'https://i.pravatar.cc/150?u=301772547', group: 'אגף מש"ה', dateOfBirth: '1988-11-18', gender: 'male' },
  { fullName: 'אבשלום מ חזן', idNumber: '58897687', photoUrl: 'https://i.pravatar.cc/150?u=58897687', group: 'אגף מש"ה', dateOfBirth: '1964-12-11', gender: 'male' },
  { fullName: 'חמיסה חדד', idNumber: '14694988', photoUrl: 'https://i.pravatar.cc/150?u=14694988', group: 'אגף מש"ה', dateOfBirth: '1939-05-01', gender: 'female' },
  { fullName: 'חגית חלוואיה', idNumber: '31888886', photoUrl: 'https://i.pravatar.cc/150?u=31888886', group: 'אגף מש"ה', dateOfBirth: '1974-10-17', gender: 'female' },
  { fullName: 'שרון טאבו', idNumber: '27321942', photoUrl: 'https://i.pravatar.cc/150?u=27321942', group: 'אגף מש"ה', dateOfBirth: '1974-08-17', gender: 'male' },
  { fullName: 'מיכל יעקב', idNumber: '43013515', photoUrl: 'https://i.pravatar.cc/150?u=43013515', group: 'שיקום ונכים', dateOfBirth: '1981-03-09', gender: 'female' },
  { fullName: 'דן יעקובס', idNumber: '53084380', photoUrl: 'https://i.pravatar.cc/150?u=53084380', group: 'אגף מש"ה', dateOfBirth: '1982-01-28', gender: 'male' },
  { fullName: 'נסים יהושע', idNumber: '59792572', photoUrl: 'https://i.pravatar.cc/150?u=59792572', group: 'אגף מש"ה', dateOfBirth: '1967-05-25', gender: 'male' },
  { fullName: 'אסטריקה יעקובזון', idNumber: '69251577', photoUrl: 'https://i.pravatar.cc/150?u=69251577', group: 'אגף מש"ה', dateOfBirth: '1934-07-18', gender: 'female' },
  { fullName: 'ששון כהן', idNumber: '29511383', photoUrl: 'https://i.pravatar.cc/150?u=29511383', group: 'אגף מש"ה', dateOfBirth: '1972-08-24', gender: 'male' },
  { fullName: 'מורן חי כהן', idNumber: '32074163', photoUrl: 'https://i.pravatar.cc/150?u=32074163', group: 'אגף מש"ה', dateOfBirth: '1974-12-24', gender: 'male' },
  { fullName: 'יואב כהן', idNumber: '40649238', photoUrl: 'https://i.pravatar.cc/150?u=40649238', group: 'אגף מש"ה', dateOfBirth: '1981-07-05', gender: 'male' },
  { fullName: 'אביבה כהן', idNumber: '57227951', photoUrl: 'https://i.pravatar.cc/150?u=57227951', group: 'אגף מש"ה', dateOfBirth: '1961-08-09', gender: 'female' },
  { fullName: 'כרם כהן', idNumber: '207193756', photoUrl: 'https://i.pravatar.cc/150?u=207193756', group: 'אגף מש"ה', dateOfBirth: '1999-05-16', gender: 'female' },
  { fullName: 'יהבית כהן', idNumber: '302915962', photoUrl: 'https://i.pravatar.cc/150?u=302915962', group: 'שיקום ונכים', dateOfBirth: '1990-01-22', gender: 'female' },
  { fullName: 'חן כהן', idNumber: '208892901', photoUrl: 'https://i.pravatar.cc/150?u=208892901', group: 'אגף מש"ה', dateOfBirth: '1997-01-03', gender: 'female' },
  { fullName: 'שוקי כדר', idNumber: '33477209', photoUrl: 'https://i.pravatar.cc/150?u=33477209', group: 'אגף מש"ה', dateOfBirth: '1976-12-03', gender: 'male' },
  { fullName: 'חנה לוי', idNumber: '209771294', photoUrl: 'https://i.pravatar.cc/150?u=209771294', group: 'אוטיסטים', dateOfBirth: '2001-04-22', gender: 'female' },
  { fullName: 'אלמוג לוי', idNumber: '311215941', photoUrl: 'https://i.pravatar.cc/150?u=311215941', group: 'אגף מש"ה', dateOfBirth: '1993-08-08', gender: 'female' },
  { fullName: 'טלי לוי', idNumber: '329197479', photoUrl: 'https://i.pravatar.cc/150?u=329197479', group: 'אגף מש"ה', dateOfBirth: '2005-12-08', gender: 'female' },
  { fullName: 'אורלי ללוש', idNumber: '22108039', photoUrl: 'https://i.pravatar.cc/150?u=22108039', group: 'אגף מש"ה', dateOfBirth: '1965-12-01', gender: 'female' },
  { fullName: 'מרק לייזר', idNumber: '306626177', photoUrl: 'https://i.pravatar.cc/150?u=306626177', group: 'שיקום ונכים', dateOfBirth: '1966-11-28', gender: 'male' },
  { fullName: 'ששון מועלם', idNumber: '56837982', photoUrl: 'https://i.pravatar.cc/150?u=56837982', group: 'אגף מש"ה', dateOfBirth: '1966-11-29', gender: 'male' },
  { fullName: 'דליה מורד', idNumber: '52135308', photoUrl: 'https://i.pravatar.cc/150?u=52135308', group: 'אגף מש"ה', dateOfBirth: '1953-12-12', gender: 'female' },
  { fullName: 'ליאת מוזס', idNumber: '35982941', photoUrl: 'https://i.pravatar.cc/150?u=35982941', group: 'אגף מש"ה', dateOfBirth: '1979-08-15', gender: 'female' },
  { fullName: 'אלכסנדר מרשטיין', idNumber: '213892425', photoUrl: 'https://i.pravatar.cc/150?u=213892425', group: 'שיקום ונכים', dateOfBirth: '2003-05-10', gender: 'male' },
  { fullName: 'יגאל מנטש', idNumber: '29066529', photoUrl: 'https://i.pravatar.cc/150?u=29066529', group: 'אגף מש"ה', dateOfBirth: '1972-01-08', gender: 'male' },
  { fullName: 'סגולה מחפוד', idNumber: '3959467', photoUrl: 'https://i.pravatar.cc/150?u=3959467', group: 'אגף מש"ה', dateOfBirth: '1946-04-01', gender: 'female' },
  { fullName: 'יעקב יצח מימון', idNumber: '201458569', photoUrl: 'https://i.pravatar.cc/150?u=201458569', group: 'אגף מש"ה', dateOfBirth: '1989-01-30', gender: 'male' },
  { fullName: 'חננאל מולאי', idNumber: '313565582', photoUrl: 'https://i.pravatar.cc/150?u=313565582', group: 'אוטיסטים', dateOfBirth: '1995-01-02', gender: 'male' },
  { fullName: 'דמיטרי מקסימצ\'ב', idNumber: '324786771', photoUrl: 'https://i.pravatar.cc/150?u=324786771', group: 'אגף מש"ה', dateOfBirth: '1996-07-26', gender: 'male' },
  { fullName: 'אוראל מזרחי', idNumber: '326082526', photoUrl: 'https://i.pravatar.cc/150?u=326082526', group: 'לא ידוע', dateOfBirth: '2004-06-03', gender: 'male' },
  { fullName: 'אורית מידן', idNumber: '34200675', photoUrl: 'https://i.pravatar.cc/150?u=34200675', group: 'אגף מש"ה', dateOfBirth: '1977-12-13', gender: 'female' },
  { fullName: 'אושר מיק', idNumber: '213355696', photoUrl: 'https://i.pravatar.cc/150?u=213355696', group: 'לא ידוע', dateOfBirth: '2003-02-26', gender: 'male' },
  { fullName: 'בנימין א מור', idNumber: '207744129', photoUrl: 'https://i.pravatar.cc/150?u=207744129', group: 'אגף מש"ה', dateOfBirth: '1998-05-07', gender: 'male' },
  { fullName: 'אייל מזרחי', idNumber: '25558693', photoUrl: 'https://i.pravatar.cc/150?u=25558693', group: 'שיקום ונכים', dateOfBirth: '1974-02-08', gender: 'male' },
  { fullName: 'גלינה נוסלוב', idNumber: '304420722', photoUrl: 'https://i.pravatar.cc/150?u=304420722', group: 'לא ידוע', dateOfBirth: '1970-01-01', gender: 'female' },
  { fullName: 'מאור סהלו', idNumber: '211782487', photoUrl: 'https://i.pravatar.cc/150?u=211782487', group: 'אגף מש"ה', dateOfBirth: '2001-01-26', gender: 'male' },
  { fullName: 'רבקה ספרדי', idNumber: '56486913', photoUrl: 'https://i.pravatar.cc/150?u=56486913', group: 'אגף מש"ה', dateOfBirth: '1960-06-02', gender: 'female' },
  { fullName: 'וסטינה סטנקביץ\'', idNumber: '311771760', photoUrl: 'https://i.pravatar.cc/150?u=311771760', group: 'אגף מש"ה', dateOfBirth: '1983-01-24', gender: 'female' },
  { fullName: 'רוסטיסלב סרבריאקוב', idNumber: '332504596', photoUrl: 'https://i.pravatar.cc/150?u=332504596', group: 'אגף מש"ה', dateOfBirth: '1989-11-13', gender: 'male' },
  { fullName: 'יצחק עבוד', idNumber: '32508822', photoUrl: 'https://i.pravatar.cc/150?u=32508822', group: 'אגף מש"ה', dateOfBirth: '1986-07-24', gender: 'male' },
  { fullName: 'רוברט פדידה', idNumber: '69907285', photoUrl: 'https://i.pravatar.cc/150?u=69907285', group: 'אגף מש"ה', dateOfBirth: '1963-10-19', gender: 'male' },
  { fullName: 'קוטי פונטה', idNumber: '69966414', photoUrl: 'https://i.pravatar.cc/150?u=69966414', group: 'אגף מש"ה', dateOfBirth: '1956-07-01', gender: 'female' },
  { fullName: 'זיו חיים פדידה', idNumber: '324115765', photoUrl: 'https://i.pravatar.cc/150?u=324115765', group: 'אגף מש"ה', dateOfBirth: '2001-10-03', gender: 'male' },
  { fullName: 'בוריס פינקלשטיין', idNumber: '307521534', photoUrl: 'https://i.pravatar.cc/150?u=307521534', group: 'אגף מש"ה', dateOfBirth: '1958-01-31', gender: 'male' },
  { fullName: 'דמיטרי פלנט', idNumber: '345666192', photoUrl: 'https://i.pravatar.cc/150?u=345666192', group: 'אגף מש"ה', dateOfBirth: '1971-10-05', gender: 'male' },
  { fullName: 'אלישבע פרידמן', idNumber: '55048144', photoUrl: 'https://i.pravatar.cc/150?u=55048144', group: 'שיקום ונכים', dateOfBirth: '1958-04-05', gender: 'female' },
  { fullName: 'שמואל קדוש', idNumber: '36295475', photoUrl: 'https://i.pravatar.cc/150?u=36295475', group: 'אגף מש"ה', dateOfBirth: '1979-04-15', gender: 'male' },
  { fullName: 'ילנה קרביץ', idNumber: '305846842', photoUrl: 'https://i.pravatar.cc/150?u=305846842', group: 'אגף מש"ה', dateOfBirth: '1978-10-11', gender: 'female' },
  { fullName: 'אדוארד קורנקוב', idNumber: '316878156', photoUrl: 'https://i.pravatar.cc/150?u=316878156', group: 'אגף מש"ה', dateOfBirth: '1946-08-06', gender: 'male' },
  { fullName: 'ילנה קוסטיוקביץ\'', idNumber: '317423705', photoUrl: 'https://i.pravatar.cc/150?u=317423705', group: 'שיקום ונכים', dateOfBirth: '1981-03-27', gender: 'female' },
  { fullName: 'יגור קונביסר', idNumber: '329041461', photoUrl: 'https://i.pravatar.cc/150?u=329041461', group: 'אגף מש"ה', dateOfBirth: '1967-10-03', gender: 'male' },
  { fullName: 'יוסי ראובן', idNumber: '58689720', photoUrl: 'https://i.pravatar.cc/150?u=58689720', group: 'אגף מש"ה', dateOfBirth: '1964-02-18', gender: 'male' },
  { fullName: 'מיכאל רוטמן', idNumber: '318668969', photoUrl: 'https://i.pravatar.cc/150?u=318668969', group: 'אגף מש"ה', dateOfBirth: '1997-09-09', gender: 'male' },
  { fullName: 'שלומי רביבו', idNumber: '40146185', photoUrl: 'https://i.pravatar.cc/150?u=40146185', group: 'אגף מש"ה', dateOfBirth: '1980-06-19', gender: 'male' },
  { fullName: 'אלקן שמעון', idNumber: '65783763', photoUrl: 'https://i.pravatar.cc/150?u=65783763', group: 'אגף מש"ה', dateOfBirth: '1958-08-18', gender: 'male' },
  { fullName: 'אברהם שרם', idNumber: '59733345', photoUrl: 'https://i.pravatar.cc/150?u=59733345', group: 'שיקום ונכים', dateOfBirth: '1966-12-31', gender: 'male' },
  { fullName: 'דורון שרעבי', idNumber: '23572183', photoUrl: 'https://i.pravatar.cc/150?u=23572183', group: 'אגף מש"ה', dateOfBirth: '1967-12-01', gender: 'male' },
  { fullName: 'ורדה שפירא', idNumber: '50835669', photoUrl: 'https://i.pravatar.cc/150?u=50835669', group: 'אגף מש"ה', dateOfBirth: '1951-08-19', gender: 'female' },
  { fullName: 'חביבה שבירו', idNumber: '52040060', photoUrl: 'https://i.pravatar.cc/150?u=52040060', group: 'אגף מש"ה', dateOfBirth: '1954-07-06', gender: 'female' },
  { fullName: 'יהודה אש שני', idNumber: '212072763', photoUrl: 'https://i.pravatar.cc/150?u=212072763', group: 'אגף מש"ה', dateOfBirth: '2001-12-08', gender: 'male' },
  { fullName: 'מרק שפירו', idNumber: '313095788', photoUrl: 'https://i.pravatar.cc/150?u=313095788', group: 'אגף מש"ה', dateOfBirth: '1956-05-13', gender: 'male' },
  { fullName: 'ברוך שכטר', idNumber: '038014502', photoUrl: 'https://i.pravatar.cc/150?u=038014502', group: 'לא ידוע', dateOfBirth: '1970-01-01', gender: 'male' },
  { fullName: 'גילה שוורץ', idNumber: '39199419', photoUrl: 'https://i.pravatar.cc/150?u=39199419', group: 'משרד הבריאות', dateOfBirth: '1970-01-01', gender: 'female' },
  { fullName: 'סיגלית גוטמן', idNumber: '308422336', photoUrl: 'https://i.pravatar.cc/150?u=308422336', group: 'משרד הבריאות', dateOfBirth: '1970-01-01', gender: 'female' },
  { fullName: 'שמעון בוהדנה', idNumber: '315550443', photoUrl: 'https://i.pravatar.cc/150?u=315550443', group: 'משרד הבריאות', dateOfBirth: '1970-01-01', gender: 'male' },
  { fullName: 'מעיין ריקין', idNumber: '312249774', photoUrl: 'https://i.pravatar.cc/150?u=312249774', group: 'משרד הבריאות', dateOfBirth: '1970-01-01', gender: 'female' },
  { fullName: 'שירה קאופמן', idNumber: '206106189', photoUrl: 'https://i.pravatar.cc/150?u=206106189', group: 'משרד הבריאות', dateOfBirth: '1970-01-01', gender: 'female' },
];

const WIDGET_TYPES = [
  'food_texture', 'walking_stability', 'risk_management', 'guardian_details',
  'medication_cardex', 'sensitivities', 'medical_diagnoses', 'personal_development',
  'exceptional_events',
];

const DEFAULT_WIDGET_VALUES: Record<string, string> = {
  food_texture: 'רגיל',                    // select — keep actual value
  walking_stability: 'יציב — ללא צורך בליווי', // select — keep actual value
  risk_management: '',
  guardian_details: '',
  medication_cardex: '',
  sensitivities: '',
  medical_diagnoses: '',
  personal_development: '',
  exceptional_events: '',
};

const PERMISSIONS = [
  { widgetType: 'food_texture', rolesAllowedToEdit: ['doctor', 'dietitian', 'nurse', 'head_nurse', 'admin'] },
  { widgetType: 'walking_stability', rolesAllowedToEdit: ['doctor', 'physiotherapist', 'occupational_therapist', 'nurse', 'head_nurse', 'admin'] },
  { widgetType: 'risk_management', rolesAllowedToEdit: ['doctor', 'psychiatrist', 'head_nurse', 'social_worker', 'admin'] },
  { widgetType: 'guardian_details', rolesAllowedToEdit: ['social_worker', 'head_nurse', 'admin'] },
  { widgetType: 'medication_cardex', rolesAllowedToEdit: ['doctor', 'psychiatrist', 'nurse', 'head_nurse', 'admin'] },
  { widgetType: 'sensitivities', rolesAllowedToEdit: ['doctor', 'nurse', 'head_nurse', 'admin'] },
  { widgetType: 'medical_diagnoses', rolesAllowedToEdit: ['doctor', 'psychiatrist', 'admin'] },
  { widgetType: 'personal_development', rolesAllowedToEdit: ['development_coordinator', 'education_coordinator', 'social_worker', 'admin'] },
  { widgetType: 'exceptional_events', rolesAllowedToEdit: ['caregiver', 'nurse', 'head_nurse', 'social_worker', 'admin'] },
];

const WIDGET_CONFIGS = [
  { widgetType: 'food_texture', inputType: 'select', options: ['רגיל', 'רך', 'מרוסק', 'נוזלי', 'מעובה'] },
  { widgetType: 'walking_stability', inputType: 'select', options: ['יציב — ללא צורך בליווי', 'זקוק לליווי', 'זקוק לעזרה מכנית', 'על כיסא גלגלים', 'מרותק למיטה'] },
  { widgetType: 'risk_management', inputType: 'freetext', options: [] },
  { widgetType: 'guardian_details', inputType: 'freetext', options: [] },
  { widgetType: 'medication_cardex', inputType: 'freetext', options: [] },
  { widgetType: 'sensitivities', inputType: 'freetext', options: [] },
  { widgetType: 'medical_diagnoses', inputType: 'freetext', options: [] },
  { widgetType: 'personal_development', inputType: 'freetext', options: [] },
  { widgetType: 'exceptional_events', inputType: 'freetext', options: [] },
];

const BUILT_IN_ROLES = [
  { roleId: 'doctor', label: 'רופא', isBuiltIn: true },
  { roleId: 'psychiatrist', label: 'פסיכיאטר', isBuiltIn: true },
  { roleId: 'physiotherapist', label: 'פיזיותרפיסט', isBuiltIn: true },
  { roleId: 'occupational_therapist', label: 'מרפא בעיסוק', isBuiltIn: true },
  { roleId: 'dietitian', label: 'תזונאי', isBuiltIn: true },
  { roleId: 'caregiver', label: 'מטפל', isBuiltIn: true },
  { roleId: 'nurse', label: 'אחות', isBuiltIn: true },
  { roleId: 'head_nurse', label: 'אחות אחראית', isBuiltIn: true },
  { roleId: 'development_coordinator', label: 'מרכז תוכניות קידום', isBuiltIn: true },
  { roleId: 'education_coordinator', label: 'רכז חינוך', isBuiltIn: true },
  { roleId: 'employment_coordinator', label: 'רכז תעסוקה', isBuiltIn: true },
  { roleId: 'admin', label: 'מנהל', isBuiltIn: true },
  { roleId: 'social_worker', label: 'עובד סוציאלי', isBuiltIn: true },
];

// ─── Helpers ─────────────────────────────────────────────────

async function seedInBatches<T>(
  label: string,
  items: T[],
  creator: (item: T) => Promise<unknown>,
  batchSize = 10,
) {
  console.log(`Seeding ${items.length} ${label}...`);
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(creator));
    process.stdout.write(`  ${Math.min(i + batchSize, items.length)}/${items.length}\r`);
  }
  console.log(`  Done: ${items.length} ${label}`);
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  console.log('=== ICare Seed Script ===\n');

  // Guard: abort if data already exists to prevent duplicates
  const { data: existingRoles } = await client.models.RoleDefinition.list({ limit: 1 });
  if (existingRoles.length > 0) {
    console.log('Database already contains data. Run with --force to re-seed (deletes all existing records first).');
    if (!process.argv.includes('--force')) process.exit(0);

    console.log('--force detected, clearing existing data...');

    // Delete all Cognito users first
    console.log('Deleting Cognito users...');
    let paginationToken: string | undefined;
    do {
      const listRes = await cognitoClient.send(
        new ListUsersCommand({
          UserPoolId: userPoolId,
          PaginationToken: paginationToken,
        }),
      );
      const cognitoUsers = listRes.Users ?? [];
      await Promise.all(
        cognitoUsers.map((u) =>
          cognitoClient.send(
            new AdminDeleteUserCommand({
              UserPoolId: userPoolId,
              Username: u.Username!,
            }),
          ),
        ),
      );
      paginationToken = listRes.PaginationToken;
    } while (paginationToken);
    console.log('Cognito users deleted.');

    const [roles, users, perms, configs, patients, widgets] = await Promise.all([
      client.models.RoleDefinition.list(),
      client.models.UserRecord.list(),
      client.models.WidgetPermission.list(),
      client.models.WidgetConfig.list(),
      client.models.Patient.list(),
      client.models.PatientWidget.list(),
    ]);
    await Promise.all([
      ...roles.data.map((r) => client.models.RoleDefinition.delete({ id: r.id })),
      ...users.data.map((u) => client.models.UserRecord.delete({ id: u.id })),
      ...perms.data.map((p) => client.models.WidgetPermission.delete({ id: p.id })),
      ...configs.data.map((c) => client.models.WidgetConfig.delete({ id: c.id })),
      ...patients.data.map((p) => client.models.Patient.delete({ id: p.id })),
      ...widgets.data.map((w) => client.models.PatientWidget.delete({ id: w.id })),
    ]);
    console.log('Cleared.\n');
  }

  await seedInBatches('roles', BUILT_IN_ROLES, (r) =>
    client.models.RoleDefinition.create(r),
  );

  // Seed users: create in Cognito first, then create DynamoDB UserRecord
  console.log(`Seeding ${USERS.length} users...`);
  for (const u of USERS) {
    const createRes = await cognitoClient.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: u.username,
        MessageAction: 'SUPPRESS',
        UserAttributes: [],
      }),
    );

    await cognitoClient.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: u.username,
        Password: u.password,
        Permanent: true,
      }),
    );

    const sub = createRes.User?.Attributes?.find((a) => a.Name === 'sub')?.Value;
    if (!sub) throw new Error(`Failed to get Cognito sub for user ${u.username}`);

    await client.models.UserRecord.create({
      cognitoId: sub,
      name: u.name,
      username: u.username,
      role: u.role,
    });

    console.log(`  Created user: ${u.username}`);
  }
  console.log(`  Done: ${USERS.length} users`);

  await seedInBatches('widget permissions', PERMISSIONS, (p) =>
    client.models.WidgetPermission.create(p),
  );

  await seedInBatches('widget configs', WIDGET_CONFIGS, (c) =>
    client.models.WidgetConfig.create({ ...c, options: c.options }),
  );

  console.log(`\nSeeding ${PATIENTS.length} patients + widgets...`);
  const now = new Date().toISOString();
  for (let i = 0; i < PATIENTS.length; i++) {
    const p = PATIENTS[i];
    const { data: patient } = await client.models.Patient.create(p);
    if (!patient) { console.error(`Failed to create patient ${p.fullName}`); continue; }

    await Promise.all(
      WIDGET_TYPES.map((wt) =>
        client.models.PatientWidget.create({
          patientId: patient.id,
          widgetType: wt,
          value: DEFAULT_WIDGET_VALUES[wt] ?? '',
          lastUpdated: now,
          updatedBy: '',
        }),
      ),
    );
    process.stdout.write(`  ${i + 1}/${PATIENTS.length}\r`);
  }
  console.log(`  Done: ${PATIENTS.length} patients + ${PATIENTS.length * WIDGET_TYPES.length} widgets`);

  console.log('\n=== Seed complete ===');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
