# JnUVerse — Manual Integration Test Script (Week 9)

**For:** Sheak Noor Muhammad Nabil (Tester), with Anik Khondokar (frontend) and Atik Jawad (backend)  
**Covers:** every flow that **changes data** (not covered by the automated read-only checks) — the Weeks 6–8 browser-QA backlog and the Week 9 journeys.  
**Automated checks already done** (read-only; re-run any time from `frontend/`): `npm run audit:api`, `npm run test:resilience`, `npm run test:journeys`, `npm run audit:responsive`.

---

## 0. Before you start

### Use the LOCAL test stack — not the shared database
Follow `backend/docs/LOCAL_TEST_STACK.md` (backend on `--settings=config.settings_local`, frontend `npm run dev`, open http://localhost:5173). Everything below writes data; on the local stack it never touches the shared Supabase database used by the deployed app.

### Accounts on the local stack
| Who | Login | Password |
|---|---|---|
| Club operator "JnU Research Society" | `club1@example.com` | `Str0ng-Pass-123` |
| Demo club operators (Robotics, Debate, Photography, Cultural Forum, Sports) | `democlub1@demo.jnuverse.test` … `democlub5@…` | `Demo-Pass-12345` |
| Demo students | `demo1@demo.jnuverse.test` … `demo5@…` | `Demo-Pass-12345` |
| New student (registration test) | Student ID `B220305044`, email `tahmida@gmail.com` | choose one |

> `LOCAL_TEST_STACK.md` currently says all logins use `Str0ng-Pass-123`; that is only true for `club1@example.com` (reported to the backend as request 8).

### Demo data facts used below
- **Robotics Club** (democlub1): members demo1, demo2; **pending request from demo3**; followers demo1, demo4; pending collaboration from Cultural Forum; accepted partner Photography.
- **demo1:** member of Robotics and Debate; follows Robotics and Cultural Forum; pending at Photography; has 3 reports.
- **demo2:** rejected by Debate; removed from Photography.
- **demo4:** no interests (interests prompt).
- `[DEMO] Rated Workshop`: ended ~1 day ago, demo1 has **not** rated it yet.

### How to record results
Mark each step ✅ / ❌. For every ❌ write what you saw (and a screenshot) in Section 14. Reset demo data at any time: `seed_demo_events --reset` then `seed_demo_events` (local settings).

---

## 1. Visitor (logged out)
| # | Step | Expected | Result |
|:---:|---|---|:---:|
| 1.1 | Open `/clubs`, search "Robotics" | Robotics card shown; navbar shows only Overview, Explore Clubs, Events | |
| 1.2 | Open a club, then an event | Pages load; event says log in to register; no Report button | |
| 1.3 | Open `/does-not-exist` | 404 page with the path and "Explore clubs" / "Log in" | |
| 1.4 | Open `/operator/analytics` | Redirected to the **operator** login | |

## 2. Student registration and onboarding
| # | Step | Expected | Result |
|:---:|---|---|:---:|
| 2.1 | `/register` with `B220305044` / `tahmida@gmail.com`, department, batch, password ×2 | Success; sent to login. Name comes from the record (Tahmida Aziza) | |
| 2.2 | Register again with the same ID | "An account already exists for this student." | |
| 2.3 | Register with a mismatched ID/email | "Student ID and email do not match a valid JnU student record." | |
| 2.4 | Log in as the new student | Dashboard with "Choose your interests" prompt | |
| 2.5 | Pick 3 interests → Save | Confirmation; suggestions appear under "Find your community." | |
| 2.6 | `/profile` → change interests → Discard, then Clear all → Save | Discard restores; Clear all saves empty; prompt returns on the dashboard | |
| 2.7 | Log in as demo4 → Skip for now → reload | Prompt stays hidden for demo4 in this browser | |

## 3. Club engagement (student)
| # | Step | Expected | Result |
|:---:|---|---|:---:|
| 3.1 | demo5: Follow a suggested club on the dashboard | Button becomes "Following"; club appears in "Your communities." | |
| 3.2 | demo5: **Join** a suggested club | "Pending"; operator of that club sees the request | |
| 3.3 | demo5: club page → Withdraw request (confirm) | Back to "Request Membership" | |
| 3.4 | demo2: Debate Society page | Note "Your previous membership request was not approved…" + Request Membership | |
| 3.5 | demo2: Photography Club page | Note "You were removed from this club…" | |
| 3.6 | demo1: Robotics → Leave Club (confirm) | Membership ends; My Clubs no longer lists it as joined | |

## 4. Events (student)
| # | Step | Expected | Result |
|:---:|---|---|:---:|
| 4.1 | demo2: open an upcoming open event → Register → confirm | "Registered"; seats left decrease; event in Events → My Registrations | |
| 4.2 | Press Escape in the confirm dialog (before confirming) | Dialog closes; focus back on the Register button | |
| 4.3 | Cancel the registration | Seat freed; event leaves My Registrations | |
| 4.4 | Try `[DEMO] Full Event Example` | "Event full" / server message, no registration | |
| 4.5 | Open an event page directly by URL while logged in (paste the link) | Page loads (no endless "Loading event details…") | |

## 5. Ratings (student)
| # | Step | Expected | Result |
|:---:|---|---|:---:|
| 5.1 | demo1 dashboard → "Rate your recent events." → rate Rated Workshop 4★ → Submit | Card disappears; "to rate" badge drops by 1; thank-you message | |
| 5.2 | Open Rated Workshop → change rating to 5★ | Saved; average updates | |
| 5.3 | Open `[DEMO] Closed Rating Event` | Read-only "Your rating", no widget (7-day window over) | |

## 6. Notices and notifications
| # | Step | Expected | Result |
|:---:|---|---|:---:|
| 6.1 | democlub1: Notices → Create New Notice (audience **members**) | Posted; listed | |
| 6.2 | demo1 (member) bell | New notification; clicking opens the Robotics club page | |
| 6.3 | demo4 (follower only) | Does **not** see the members-only notice | |
| 6.4 | democlub1: edit the notice title; then delete it (Escape closes each dialog first) | Edited; deleted with confirmation | |
| 6.5 | demo1: Notifications → Mark all read | Bell badge clears | |

## 7. Membership review (operator)
| # | Step | Expected | Result |
|:---:|---|---|:---:|
| 7.1 | democlub1 dashboard → Membership Requests → **Approve** demo3 | Toast; Approved Members +1, Pending −1 | |
| 7.2 | (Re-seed or use another request) → **Reject** from Members page | Request leaves the queue; demo student sees the rejected note | |
| 7.3 | Members → Remove a member (dialog; try Escape first) | Member removed; student sees "removed" note | |
| 7.4 | Members page search "Demo" | List filters; student emails never shown | |

## 8. Events, banners and attendance (operator)
| # | Step | Expected | Result |
|:---:|---|---|:---:|
| 8.1 | democlub1: Create event with a valid banner (PNG/JPG/WebP ≤ 5 MB) | Draft created; banner on event page and list thumbnail | |
| 8.2 | Upload a 6 MB image / a renamed text file as banner | Size message / server error message; nothing saved | |
| 8.3 | Publish the draft; edit venue; then cancel it (Escape closes dialogs first) | Published → editable → Cancelled (final); registered students notified | |
| 8.4 | Ended event (Rated Workshop) → Attendees | "N of M attended"; checkboxes enabled | |
| 8.5 | Untick one student → "Unsaved changes" → Save Attendance → reload | Saved count shown; ticks persist | |
| 8.6 | Mark all / Clear all / Discard | Affect every registration (all pages) | |
| 8.7 | Attendees of an upcoming or cancelled event | Checkboxes locked with the reason | |

## 9. Club profile (operator)
| # | Step | Expected | Result |
|:---:|---|---|:---:|
| 9.1 | Navbar club name → club page → Edit Profile | Stitch "Club Insignia & Logo" section first | |
| 9.2 | Upload logo (drag & drop and click), replace, remove | Preview updates; logo on cards, profile, navbar avatar | |
| 9.3 | Logo > 2 MB / not an image | Error message; nothing saved | |
| 9.4 | Change interests and contact email → Save; Cancel discards edits | Tags update on profile and Explore Clubs | |

## 10. Collaborations (operator)
| # | Step | Expected | Result |
|:---:|---|---|:---:|
| 10.1 | democlub1 → Collaborations → Propose to Sports Club (optional linked event) | Sent; appears under Outgoing; Sports operator notified | |
| 10.2 | Propose again to the same club | "A pending collaboration request already exists…" | |
| 10.3 | democlub4 (Cultural Forum): accept/reject the request to Robotics; democlub1 cancels an outgoing one | Status updates; partners appear on club pages after accept | |
| 10.4 | Notification click (collaboration_update) | Opens `/operator/collaborations` | |

## 11. Content reports
| # | Step | Expected | Result |
|:---:|---|---|:---:|
| 11.1 | demo5: report a club, reason "Spam" | "Report received"; listed in My Reports as "Received" | |
| 11.2 | Report the same club again | "You have already reported this" | |
| 11.3 | Reason "Other" with empty details | Field error | |
| 11.4 | democlub1 on Robotics club/event pages | No Report button | |

## 12. Analytics and activity
| # | Step | Expected | Result |
|:---:|---|---|:---:|
| 12.1 | democlub1 → Analytics → presets and a custom range; From later than To | Both reports update; error for reversed dates; page dims while loading | |
| 12.2 | After step 8.5, check My Club attendance and the Rated Workshop event report | Attendance figures and response rate changed accordingly | |
| 12.3 | Chart / Table switch, hover and Tab through bars | Same numbers in both views; tooltips on hover and focus | |
| 12.4 | demo1 → Activity | Score = clubs joined + events attended + ratings given; attendance rate ≤ 100 % (backend request 7 open) | |

## 13. Cross-cutting
| # | Step | Expected | Result |
|:---:|---|---|:---:|
| 13.1 | Phone width (375 px, browser dev tools) on dashboard, events, analytics | No sideways scrolling; menu button opens mobile menu | |
| 13.2 | Laptop width 1024 px as operator | Navbar fits; Logout visible | |
| 13.3 | Keyboard only: Tab through a page, open and close a dialog | Visible focus; Escape closes; focus returns | |
| 13.4 | Delete `access_token` and `refresh_token` in dev tools → reload a protected page | "Your session has expired" on the right login page; returns after login | |

---

## 14. Defects found

| # | Step | What happened | Screenshot | Severity | Owner |
|:---:|---|---|---|---|---|
| | | | | | |
