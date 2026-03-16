import { WidgetType } from '../types';

export type TrafficLight = 'green' | 'yellow' | 'red' | 'neutral';

// ─── FoodTexture exact options ────────────────────────────────
// ['רגיל', 'רך', 'מרוסק', 'נוזלי', 'מעובה']
const FOOD_GREEN  = new Set(['רגיל']);
const FOOD_YELLOW = new Set(['רך', 'מעובה']);   // soft / thickened — some modification needed
const FOOD_RED    = new Set(['מרוסק', 'נוזלי']); // pureed / liquid — major modification

// ─── WalkingStability exact options ──────────────────────────
// ['יציב — ללא צורך בליווי', 'זקוק לליווי', 'זקוק לעזרה מכנית', 'על כיסא גלגלים', 'מרותק למיטה']
const WALK_GREEN  = new Set(['יציב — ללא צורך בליווי']);
const WALK_YELLOW = new Set(['זקוק לליווי', 'זקוק לעזרה מכנית']);
const WALK_RED    = new Set(['על כיסא גלגלים', 'מרותק למיטה']);

export function getTrafficLight(widgetType: WidgetType, value: string): TrafficLight {
  switch (widgetType) {
    case WidgetType.FoodTexture:
      if (!value.trim())          return 'neutral'; // not yet assessed
      if (FOOD_GREEN.has(value))  return 'green';
      if (FOOD_YELLOW.has(value)) return 'yellow';
      if (FOOD_RED.has(value))    return 'red';
      return 'neutral';

    case WidgetType.WalkingStability:
      if (!value.trim())          return 'neutral'; // not yet assessed
      if (WALK_GREEN.has(value))  return 'green';
      if (WALK_YELLOW.has(value)) return 'yellow';
      if (WALK_RED.has(value))    return 'red';
      return 'neutral';

    case WidgetType.ExceptionalEvents:
      // Colour managed directly by EventLogCard
      return 'neutral';

    default:
      // Free-text: empty = green (no issues noted), any content = red (attention needed)
      return value.trim() ? 'red' : 'green';
  }
}
