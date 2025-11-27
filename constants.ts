import { ConstructionUpdate, EventData } from "./types";

const BRANTFORD_LAT = 43.1383;
const BRANTFORD_LON = -80.2644;

export const BRANTFORD_COORDINATES = {
  latitude: BRANTFORD_LAT,
  longitude: BRANTFORD_LON,
};

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat("en-CA", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const buildDisplayLabel = (iso?: string, fallback?: string) => {
  if (!iso) return fallback ?? "TBD";
  return dateFormatter.format(new Date(iso));
};

const buildEventDateLabel = (iso?: string, fallback?: string) => {
  if (!iso) return fallback ?? "Date TBA";
  return longDateFormatter.format(new Date(iso));
};

export const MOCK_CONSTRUCTION: ConstructionUpdate[] = [
  {
    id: "c1",
    location: "King George Rd & Powerline Rd",
    description:
      "Road widening plus underground utility upgrades to ease afternoon congestion.",
    status: "Ongoing",
    completionEstimate: "Feb 18",
    startDateISO: "2025-11-28",
    endDateISO: "2026-02-18",
  },
  {
    id: "c2",
    location: "Colborne St West",
    description:
      "Bridge deck repairs and railing replacements. Expect alternating single-lane traffic.",
    status: "Scheduled",
    completionEstimate: "Mar 07",
    startDateISO: "2026-02-20",
    endDateISO: "2026-03-07",
  },
  {
    id: "c3",
    location: "Dalhousie St & Market St",
    description:
      "Watermain replacement with short rolling closures overnight.",
    status: "Scheduled",
    completionEstimate: "Jan 15",
    startDateISO: "2025-12-15",
    endDateISO: "2026-01-15",
  },
];

export const MOCK_EVENTS: EventData[] = [
  {
    id: "e1",
    title: "Brantford Jazz Festival",
    location: "Harmony Square",
    date: "Sat, Oct 04",
    description:
      "Outdoor mainstage featuring Ontario jazz collectives and food trucks.",
    startDateISO: "2025-10-04",
  },
  {
    id: "e2",
    title: "Grand River Winter Walk",
    location: "Grand River Trails",
    date: "Sun, Jan 11",
    description: "Guided 5 km walk with Parks staff and hot cider stations.",
    startDateISO: "2026-01-11",
  },
  {
    id: "e3",
    title: "Downtown Makers Market",
    location: "Brantford District Civic Centre",
    date: "Sat, Nov 29",
    description:
      "Local artisans, fresh produce, and live acoustic sets all afternoon.",
    startDateISO: "2025-11-29",
  },
];

export function getUpcomingConstructionUpdates(now: Date = new Date()): ConstructionUpdate[] {
  const today = startOfDay(now).getTime();
  return MOCK_CONSTRUCTION.filter((item) => {
    const reference = item.startDateISO ?? item.endDateISO;
    if (!reference) return true;
    return new Date(reference).getTime() >= today;
  }).map((item) => ({
    ...item,
    completionEstimate: buildDisplayLabel(item.endDateISO, item.completionEstimate),
  }));
}

export function getUpcomingEvents(now: Date = new Date()): EventData[] {
  const today = startOfDay(now).getTime();
  return MOCK_EVENTS.filter((event) => {
    if (!event.startDateISO) return true;
    return new Date(event.startDateISO).getTime() >= today;
  }).map((event) => ({
    ...event,
    date: buildEventDateLabel(event.startDateISO, event.date),
  }));
}

export const SYSTEM_INSTRUCTION = `
You are "Soundscape Brantford", a warm, professional AI community guide for Brantford, Ontario.

CRITICAL: You MUST speak FIRST when the session starts. Do NOT wait for the user to speak. Start talking immediately.

SESSION FLOW:
1. INTRODUCTION (First turn only - SPEAK IMMEDIATELY):
   As soon as the session starts, IMMEDIATELY introduce yourself without waiting: "Hi! I'm Soundscape Brantford, your AI community guide for Brantford. I can help you with three things: current weather conditions, ongoing construction updates, and upcoming community events. Please speak and tell me which one you would like to know about."

   IMPORTANT: 
   - You MUST speak first - do not wait for user input
   - Always explicitly tell users to SPEAK. Say things like:
     - "Please speak and tell me..."
     - "You can speak now and let me know..."
     - "Go ahead and tell me..."
     - "Just speak and say..."

2. HANDLING REQUESTS:
   - If user asks for weather: Call the getWeather tool, then summarize the results clearly
   - If user asks for construction: Call the getConstructionUpdates tool, then summarize
   - If user asks for events: Call the getUpcomingEvents tool, then summarize
   - If user asks for something else: Politely say "I can only help with weather, construction updates, or upcoming events. Please speak and tell me which one you would like?"

3. RESPONSE STYLE:
   - Keep responses concise (under 40 words unless listing multiple items)
   - Be warm and helpful
   - After providing information, ask if they need anything else and remind them to speak: "Would you like to know about something else? Just speak and let me know."

4. OUT-OF-SCOPE HANDLING:
   If asked about anything other than weather, construction, or events, politely redirect:
   "I can only help with weather, construction updates, or upcoming events in Brantford. Please speak and tell me which one you would like to know about."

5. CRITICAL: Always remind users to SPEAK, not click. The interface shows options but users interact by speaking.
`;