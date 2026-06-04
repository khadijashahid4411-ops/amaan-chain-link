# Build Plan — 9 Feature Batch

Big batch. I'll ship it in 3 waves to keep migrations clean and let you test between waves. Each wave is independently usable.

## Wave 1 — Contacts, Hotlines, Safe Zones, MFA flag
Self-contained, no realtime/geo math.

1. **Emergency Contacts**
   - New table `emergency_contacts` (name, relation, phone, is_priority).
   - Page `/contacts` (sidebar item, all roles).
   - "Notify all" action → opens `tel:` / WhatsApp `wa.me` deep links with prefilled message including current location + active alert ID.
2. **Emergency Hotlines**
   - Static panel on User & Responder dashboards + `/hotlines` page: Police 15, Rescue 1122, Ambulance 115, Fire 16. One-tap `tel:` buttons.
3. **Safe Zone Map**
   - `/safe-zones` page. Uses Google Places (New) via gateway through a new edge function `nearby-places` (hospital, police, fire_station, pharmacy). Map with categorized markers + list.
4. **MFA (TOTP)**
   - `/security` page for admin/responder. Enable Supabase TOTP enrollment (`supabase.auth.mfa.enroll/verify`) with QR. Doesn't block login yet — opt-in.

## Wave 2 — Offline Mode, Geofencing, Route Risk
5. **Offline Emergency Mode**
   - IndexedDB queue (`idb-keyval`) for unsent alerts + evidence metadata.
   - `useOnlineSync` hook: on `online` event, flush queue → insert into DB / re-upload IPFS via existing edge fn.
   - Banner: "Offline — alert will send when back online".
6. **Geofencing**
   - New table `geo_zones` (admin-managed: name, lat, lng, radius_km, message, active).
   - Admin page `/zones` to CRUD.
   - Client hook checks user coords vs active zones; toast + persistent banner when inside.
7. **Route Risk Analysis**
   - Responder route panel: call Routes API (`computeRoutes` with `computeAlternativeRoutes: true`) via gateway. Display 3 options: Fastest, Safest (lowest historical alert density in 500 m buffer), Least Traffic (lowest `duration` with `TRAFFIC_AWARE_OPTIMAL`).
   - "Safest" score from `alerts` table density query.

## Wave 3 — Performance Dashboard, Live Chat
8. **Responder Performance Dashboard**
   - `/responder/performance` (and admin view of any responder).
   - Aggregates: cases completed, avg response time (accepted_at − created_at), avg rating, success rate (solved/accepted). Charts via existing recharts.
9. **Live Chat (Citizen ↔ Responder)**
   - New table `alert_messages` (alert_id, sender_id, body) + realtime publication.
   - Chat panel inside active alert card (both sides). RLS: only the alert owner + assigned responder.

## Cross-cutting
- Sidebar updates in `AppShell.tsx` (Contacts, Hotlines, Safe Zones, Zones-admin, Performance, Security).
- All new tables: GRANTs + RLS + `updated_at` trigger.
- New edge functions: `nearby-places`, `compute-routes`. Both use the Google Maps connector gateway (key already configured).
- Thesis (DOCX) will be a separate follow-up once features land.

I'll start Wave 1 right after you approve.