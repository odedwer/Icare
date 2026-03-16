import { WidgetType } from '../types';

export type TrafficLight = 'green' | 'yellow' | 'red' | 'neutral';

function matchesAny(value: string, keywords: string[]): boolean {
  return keywords.some((kw) => value.includes(kw));
}

// FoodTexture (מרקם מזון)
const FOOD_GREEN = ['רגיל', 'נורמלי', 'ללא הגבלה', 'מלא'];
const FOOD_YELLOW = ['קצוץ', 'רך', 'חתוך', 'קצוץ דק', 'מרוסק חלקי'];
const FOOD_RED = ['טחון', 'מחית', 'נוזלי', 'מרוסק', 'מוחלק', 'תרסיס', 'נוזל סמיך'];

// WalkingStability (יציבות בהליכה)
const WALK_GREEN = ['עצמאי', 'ללא עזר', 'יציב', 'תקין', 'ללא סיוע', 'הולך'];
const WALK_YELLOW = ['הליכון', 'מקל', 'עם עזר', 'עם פיקוח', 'עם סיוע', 'קביים', 'עזר'];
const WALK_RED = ['כסא גלגלים', 'לא מהלך', 'אינו מהלך', 'שכיבה', 'מצע', 'מיטה'];

export function getTrafficLight(widgetType: WidgetType, value: string): TrafficLight {
  if (!value.trim()) return 'neutral';

  switch (widgetType) {
    case WidgetType.FoodTexture:
      if (matchesAny(value, FOOD_GREEN)) return 'green';
      if (matchesAny(value, FOOD_RED)) return 'red';
      if (matchesAny(value, FOOD_YELLOW)) return 'yellow';
      return 'neutral';

    case WidgetType.WalkingStability:
      if (matchesAny(value, WALK_GREEN)) return 'green';
      if (matchesAny(value, WALK_RED)) return 'red';
      if (matchesAny(value, WALK_YELLOW)) return 'yellow';
      return 'neutral';

    case WidgetType.ExceptionalEvents: {
      // Value is a JSON array of event log entries; red if any entries exist
      try {
        const entries = JSON.parse(value);
        return Array.isArray(entries) && entries.length > 0 ? 'red' : 'neutral';
      } catch {
        return value.trim() ? 'red' : 'neutral';
      }
    }

    default:
      // All other free-text widgets: red if any content (signals important clinical info)
      return 'red';
  }
}
