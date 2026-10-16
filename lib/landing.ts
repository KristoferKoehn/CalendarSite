/**
 * Where a signed-in person is sent when they ask for "the calendar" rather than a specific page.
 *
 * The kiosk, because the question the product answers most often is what is happening now and
 * what is next. Everything else is one click away in the header, and the calendar's own Day and
 * Month views are still where they were.
 *
 * Named for what it is. It was `LANDING`, which became misleading the moment there was a real
 * landing page in front of the calendar: the portfolio is the landing, this is the calendar's own
 * front door.
 */
export const CALENDAR_LANDING = "/calendar/kiosk";
