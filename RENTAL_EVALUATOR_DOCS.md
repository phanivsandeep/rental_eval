# Rental Property Evaluator — Project Documentation
> Full specification for Claude Code implementation

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Functional Requirements](#functional-requirements)
4. [Non-Functional Requirements](#non-functional-requirements)
5. [System Architecture](#system-architecture)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Agents & Delegation](#agents--delegation)
9. [Tools & External APIs](#tools--external-apis)
10. [Frontend Requirements](#frontend-requirements)
11. [Security Design](#security-design)
12. [Folder Structure](#folder-structure)
13. [Environment Variables](#environment-variables)
14. [Deployment](#deployment)

---

## Project Overview

A persona-first rental property evaluator powered by LangChain DeepAgents. The user provides their lifestyle preferences, transportation situation, and a rental address. A multi-agent system evaluates the property across 8 dimensions and produces a structured, persona-specific narrative report. Reports are saved for future reference.

**Core Differentiator:** The evaluation is not generic — it weights and reasons differently based on who the user is. A car-free night shift worker gets a completely different report than a family with two cars for the same address.

---

## Tech Stack

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | Vite + TypeScript + Tailwind CSS | Vercel (free) |
| Backend | FastAPI + Python 3.11 | Render (free + UptimeRobot ping) |
| Agent Framework | LangChain DeepAgents | — |
| Database | Supabase (Postgres) | Supabase free tier |
| Web Search | Tavily API | Free tier |
| Amenities & Places | Yelp Fusion API | Free tier |
| Commute & Transit | Google Maps Distance Matrix + Directions API | Free $200/mo credit |
| Crime Data | SpotCrime API | Free |
| Climate & Air Quality | OpenWeatherMap + EPA AirNow API | Free |
| Walkability | Walkscore API | Free dev tier |
| Agent Tracing | LangSmith | Free tier |
| Identity | Anonymous session UUID in httpOnly encrypted cookie | — |

---

## Functional Requirements

### FR-1: User Profile Management
- User can input and save a lifestyle profile including:
  - Ethnicity and food culture preferences
  - Exercise and outdoor activity habits
  - Work schedule (9-5, remote, night shift, irregular)
  - Work location address (for commute calculation)
  - Transportation type: `car` | `no_car` | `ev`
  - Household type: `solo` | `couple` | `family`
  - Pet ownership (yes/no, pet type)
  - Monthly budget (rent ceiling)
  - Any health conditions relevant to proximity needs
  - Priority ranking of evaluation dimensions
- Profile is persisted to DB linked to anonymous session
- User can update profile at any time

### FR-2: Address Input
- User inputs a rental property address
- Address is geocoded before evaluation begins
- User can evaluate multiple addresses across sessions

### FR-3: API Key Management
- User provides their own Anthropic API key on first use
- Key is encrypted and stored in httpOnly cookie
- Key is never stored in the database
- User can update or remove their key at any time

### FR-4: Evaluation Execution
- On submission, orchestrator agent spawns 8 async parallel subagents
- Each subagent evaluates one dimension using relevant tools
- User sees live progress as each subagent completes
- Full report is generated once all subagents finish
- Report is saved to database linked to user session

### FR-5: Report Display
- Report displays:
  - Overall score (0-100)
  - Per-dimension scores with summaries
  - Persona-specific narrative (written as if talking to this specific user)
  - Key pros and cons
  - Red flags (if any)
  - Cost breakdown estimate
- Report is shareable via unique URL

### FR-6: Evaluation History
- User can view all past evaluations
- Each saved evaluation shows address, date, overall score
- User can re-open any past report
- User can delete past evaluations

### FR-7: Neighborhood Cache
- API results for a given zip code are cached for 24 hours
- Subsequent evaluations in the same zip code reuse cached data
- Reduces external API quota consumption

---

## Non-Functional Requirements

### NFR-1: Performance
- Subagents run async and in parallel — total evaluation time target: under 45 seconds
- Frontend streams subagent progress in real time — user never stares at a blank spinner
- Neighborhood cache hit should reduce evaluation time to under 20 seconds
- API response times: all endpoints under 500ms except `/evaluate` (streaming)

### NFR-2: Security
- Anthropic API key never stored in database or server logs
- API key encrypted with AES-256 (Fernet) before cookie storage
- httpOnly cookie — inaccessible to JavaScript
- Secure + SameSite=Strict cookie flags in production
- All DB access through backend service role only — frontend never touches Supabase directly
- Input sanitization on all address and text fields
- Rate limiting: 10 evaluation requests per IP per hour

### NFR-3: Reliability
- Each subagent has a 30-second timeout
- If a subagent fails or times out, orchestrator marks that section as "unavailable" and completes the rest of the report
- Backend health endpoint for UptimeRobot ping to prevent Render spin-down
- Graceful error messages shown to user if evaluation partially fails

### NFR-4: Scalability (showcase-level)
- Stateless backend — each request is fully independent
- No server-side session storage
- Supabase handles all persistence

### NFR-5: Observability
- All agent runs traced via LangSmith
- Each evaluation linked to a LangSmith trace ID stored in the report
- Errors logged with context (no API keys in logs)

### NFR-6: Accessibility & UX
- Mobile responsive frontend
- Progress streaming so user always knows what's happening
- Clear error states with actionable messages
- Report printable / exportable as PDF (stretch goal)

---

## System Architecture

```
User Browser (Vite + TS + Tailwind)
     │
     ├── httpOnly Cookie: { session_id, encrypted_api_key }
     │
     ▼
FastAPI Backend (Render)
     │
     ├── /profile      → read/write user profile (Supabase)
     ├── /evaluate     → stream evaluation progress + final report
     ├── /reports      → list/get/delete past evaluations (Supabase)
     └── /health       → UptimeRobot ping endpoint
          │
          ▼
     Orchestrator DeepAgent
          │
          ├── [async] Safety Agent
          ├── [async] Transportation Agent
          ├── [async] Food & Grocery Agent
          ├── [async] Lifestyle & Wellness Agent
          ├── [async] Convenience & Services Agent
          ├── [async] Utilities & Cost Agent
          ├── [async] Building & Landlord Agent
          └── [async] Future Risk Agent
                    │
                    ▼
          Synthesize → Persona Narrative Report
                    │
                    ▼
          Save to Supabase evaluations table
                    │
                    ▼
          Stream complete report to frontend
```

---

## Database Schema

### Table: `users`
```sql
create table users (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid unique not null,
  profile      jsonb not null default '{}',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index idx_users_session_id on users(session_id);
```

**Profile JSONB shape:**
```json
{
  "ethnicity": "South Asian",
  "food_preferences": ["Indian", "vegetarian"],
  "exercise_routine": "daily gym + outdoor runs",
  "outdoor_preferences": ["hiking", "cycling"],
  "work_schedule": "9-5",
  "work_location": "123 Tech Drive, San Jose CA",
  "transportation": "no_car",
  "household": "solo",
  "has_pets": false,
  "pet_type": null,
  "budget": 2500,
  "health_conditions": [],
  "priorities": ["safety", "commute", "food", "lifestyle"]
}
```

---

### Table: `evaluations`
```sql
create table evaluations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references users(id) on delete cascade,
  address      text not null,
  zip_code     text not null,
  report       jsonb not null default '{}',
  status       text default 'pending',
  trace_id     text,
  created_at   timestamptz default now()
);

create index idx_evaluations_user_id on evaluations(user_id);
create index idx_evaluations_created on evaluations(created_at desc);
```

**Status values:** `pending` | `running` | `complete` | `failed`

**Report JSONB shape:**
```json
{
  "overall_score": 74,
  "persona_narrative": "For a car-free South Asian remote worker who runs daily...",
  "pros": ["0.3mi to Indian grocery", "24/7 transit nearby"],
  "cons": ["High street parking crime", "No off-leash dog area"],
  "red_flags": ["Landlord has 3 eviction filings in 2 years"],
  "monthly_cost_estimate": {
    "rent": 2200,
    "electricity": 85,
    "gas": 30,
    "internet": 60,
    "transit_pass": 120,
    "total_estimate": 2495
  },
  "sections": {
    "safety": {
      "score": 65,
      "summary": "Moderate crime, mostly property-related",
      "details": "..."
    },
    "transportation": {
      "score": 82,
      "summary": "Strong transit coverage, frequent buses",
      "details": "..."
    },
    "food": {
      "score": 90,
      "summary": "Excellent South Asian grocery options nearby",
      "details": "..."
    },
    "lifestyle": {
      "score": 78,
      "summary": "Good parks, gym 0.4mi away",
      "details": "..."
    },
    "convenience": {
      "score": 71,
      "summary": "Pharmacy nearby, ER is 2.1 miles",
      "details": "..."
    },
    "utilities": {
      "score": 68,
      "summary": "Moderate electricity costs, good ISP options",
      "details": "..."
    },
    "building": {
      "score": 55,
      "summary": "Landlord has dispute history, building is older",
      "details": "..."
    },
    "future_risk": {
      "score": 72,
      "summary": "Stable neighborhood, minor gentrification signs",
      "details": "..."
    }
  }
}
```

---

### Table: `neighborhood_cache`
```sql
create table neighborhood_cache (
  zip_code    text primary key,
  data        jsonb not null default '{}',
  expires_at  timestamptz not null,
  created_at  timestamptz default now()
);

create index idx_cache_expires on neighborhood_cache(expires_at);
```

**Cache TTL:** 24 hours

---

### Row Level Security
```sql
alter table users enable row level security;
alter table evaluations enable row level security;
alter table neighborhood_cache enable row level security;

-- All access through backend service role only
create policy "service_only" on users for all using (false);
create policy "service_only" on evaluations for all using (false);
create policy "service_only" on neighborhood_cache for all using (false);
```

---

## API Endpoints

### `GET /health`
UptimeRobot ping. Returns 200.
```json
{ "status": "ok" }
```

---

### `POST /session`
Creates a new anonymous session. Called on first app load if no session cookie exists.

**Response:**
```json
{ "session_id": "uuid" }
```
Sets `session_id` in httpOnly cookie.

---

### `POST /key`
Stores user's encrypted Anthropic API key in cookie.

**Request body:**
```json
{ "api_key": "sk-ant-..." }
```
**Response:**
```json
{ "success": true }
```
Encrypts key with Fernet using `COOKIE_SECRET`, sets `encrypted_api_key` in httpOnly cookie. Key never touches DB.

---

### `DELETE /key`
Clears the API key cookie.

---

### `GET /profile`
Returns current user's saved profile.

**Auth:** Reads `session_id` from cookie → looks up user in DB.

**Response:**
```json
{ "profile": { ...profile shape... } }
```

---

### `POST /profile`
Creates or updates user profile.

**Request body:**
```json
{ "profile": { ...profile shape... } }
```
**Response:**
```json
{ "success": true, "profile": { ...updated profile... } }
```

---

### `POST /evaluate`
Starts an evaluation. Returns a **Server-Sent Events (SSE) stream**.

**Request body:**
```json
{
  "address": "456 Oak Street, San Jose, CA 95112"
}
```

**Auth:** Reads `session_id` and `encrypted_api_key` from cookies.

**SSE stream events:**
```
event: started
data: { "evaluation_id": "uuid", "address": "456 Oak Street..." }

event: agent_update
data: { "agent": "safety", "status": "running" }

event: agent_update
data: { "agent": "safety", "status": "complete", "score": 65, "summary": "..." }

event: agent_update
data: { "agent": "transportation", "status": "running" }

... (one pair per agent)

event: complete
data: { "evaluation_id": "uuid", "report": { ...full report shape... } }

event: error
data: { "message": "..." }
```

---

### `GET /reports`
Returns list of past evaluations for current session user.

**Response:**
```json
{
  "reports": [
    {
      "id": "uuid",
      "address": "456 Oak Street, San Jose CA",
      "overall_score": 74,
      "status": "complete",
      "created_at": "2026-04-12T10:00:00Z"
    }
  ]
}
```

---

### `GET /reports/{evaluation_id}`
Returns full report for a specific evaluation.

**Response:**
```json
{
  "id": "uuid",
  "address": "...",
  "report": { ...full report shape... },
  "created_at": "..."
}
```

---

### `DELETE /reports/{evaluation_id}`
Deletes a specific evaluation. Only owner (by session) can delete.

**Response:**
```json
{ "success": true }
```

---

## Agents & Delegation

### Orchestrator Agent
**Role:** Master coordinator. Does not evaluate directly.

**Responsibilities:**
- Receives user profile + address
- Checks neighborhood cache for zip code
- Spawns all 8 subagents in parallel as async tasks
- Passes relevant profile slice to each subagent
- Collects all subagent results
- Synthesizes into final persona-specific narrative report
- Calculates overall weighted score based on user's priority ranking
- Saves report to Supabase

**Tools available:** None directly — delegates everything

**System prompt focus:** Planning, synthesis, persona-aware narrative writing

---

### Subagent 1 — Safety Agent
**Role:** Evaluate crime, environmental, and disaster risk

**Evaluates:**
- Crime data by type (violent, property, car theft, burglary) for zip code
- Crime broken down by time of day — matched to user's work schedule
- Flood zone classification
- Wildfire risk rating (critical for California)
- Earthquake risk
- Superfund / industrial pollution site proximity
- Air quality index (EPA AQI — chronic, not seasonal)
- Sex offender registry density
- Estimated renter's insurance rate for zip

**Tools used:**
- `get_crime_data(zip_code)`
- `get_air_quality(zip_code)`
- `web_search(query)` — flood zone, wildfire risk, earthquake data

**Output:** Score 0-100, summary string, detailed findings

---

### Subagent 2 — Transportation Agent
**Role:** Evaluate commute and mobility — branches on user's transportation type

**If user has car:**
- Street vs garage parking availability near address
- Parking permit requirements and monthly cost
- Car break-in and vehicle theft rates specifically
- Traffic congestion patterns 3-5 mile radius by time of day
- Drive time to work address at user's commute hours
- Gas station proximity and density
- EV charging station proximity (if ev user)

**If user has no car:**
- Transit lines serving the address
- Bus/train frequency (especially at user's commute times)
- Last service time (critical for night shift workers)
- Transit safety (crime at nearby stops)
- Walkability score
- Bike lane infrastructure quality
- Bike share availability
- Uber/Lyft average wait time for that area
- Commute time to work address via transit

**Tools used:**
- `get_walk_score(address)`
- `get_commute_time(origin, destination, mode, departure_time)`
- `get_transit_info(address)`
- `get_crime_data(zip_code)` — filtered for vehicle crime if car user
- `web_search(query)` — parking availability, permit costs

**Output:** Score 0-100, summary string, detailed findings

---

### Subagent 3 — Food & Grocery Agent
**Role:** Match food access to user's cultural preferences and daily convenience

**Evaluates:**
- Ethnic grocery stores matching user's food culture (Indian, Asian, Hispanic, Middle Eastern, etc.) — within 2 miles
- General grocery chain proximity and options
- Convenience store proximity and late night access (7-Eleven, etc.)
- Fast food chains proximity
- Sit-down restaurant density by cuisine type matching user preference
- Farmers markets if relevant to user profile
- Food delivery service coverage and average delivery time for that address

**Tools used:**
- `search_yelp(location, category, term)` — primary tool for all food/grocery
- `web_search(query)` — delivery coverage, farmers markets

**Output:** Score 0-100, summary string, detailed findings

---

### Subagent 4 — Lifestyle & Wellness Agent
**Role:** Match neighborhood character to user's daily routine and hobbies

**Evaluates:**
- Gym and fitness center proximity (within 1 mile walking, 3 miles driving)
- Running trails, bike paths, walking paths quality
- Parks and green space acreage within 1 mile
- Off-leash dog parks if user has pets
- Outdoor recreation options (hiking, water, sports courts)
- Nightlife density — scored positively or negatively based on user preference
- Community events, cultural festivals matching user's ethnicity/culture
- Age demographic match to user's household type
- Language spoken in neighborhood (comfort for non-native speakers)

**Tools used:**
- `search_yelp(location, category)` — gyms, parks, nightlife, community centers
- `get_walk_score(address)` — bike score component
- `web_search(query)` — demographic info, cultural events, trail info

**Output:** Score 0-100, summary string, detailed findings

---

### Subagent 5 — Convenience & Services Agent
**Role:** How easily can daily errands and emergencies be handled

**Evaluates:**
- Pharmacy proximity (flag if no 24hr option nearby)
- Urgent care proximity
- ER / hospital distance and drive time
- Specialist clinic density if user has health conditions
- Vet proximity if user has pets
- Pet store proximity if user has pets
- Hardware store, laundromat proximity
- Bank / ATM proximity
- Schools and childcare if family household
- Post office and shipping services

**Tools used:**
- `search_yelp(location, category)` — pharmacies, urgent care, laundromats, vets
- `get_commute_time(address, hospital, driving)` — ER drive time
- `web_search(query)` — school ratings if family

**Output:** Score 0-100, summary string, detailed findings

---

### Subagent 6 — Utilities & Cost Agent
**Role:** Estimate true monthly cost beyond rent

**Evaluates:**
- Average electricity bill for zip code + season (OpenWeatherMap climate data)
- Average gas/heating bill estimate
- Internet providers available at exact address + average speeds + prices
- Cell signal strength by major carrier for that address
- Parking permit monthly cost if applicable
- Estimated renter's insurance for zip
- Water bill estimates
- Overall monthly cost of living estimate beyond rent

**Tools used:**
- `get_weather_climate(zip_code)` — average temperature for bill estimation
- `web_search(query)` — ISP availability at address, average utility costs by zip, cell coverage

**Output:** Score 0-100, summary string, monthly cost breakdown object

---

### Subagent 7 — Building & Landlord Agent
**Role:** Evaluate the specific unit, building, and landlord reputation

**Evaluates:**
- Landlord name / management company court filing history (evictions, disputes)
- Building code violation history
- Pest complaint records (public health data where available)
- Building age and known infrastructure concerns
- Noise sources near address:
  - Airport flight paths
  - Highway or freeway proximity
  - Train / metro tracks
  - Bars and nightclubs within 0.2 miles
  - Active construction zones
- Cell signal and internet confirmed for building (cross-check with utilities agent)

**Tools used:**
- `web_search(query)` — landlord name + "complaints" / "court" / "eviction", building violations, noise complaints
- `search_yelp(location, "bars nightlife")` — nightlife density near address

**Output:** Score 0-100, summary string, red flags list

---

### Subagent 8 — Future Risk Agent
**Role:** Is this a good decision 12-24 months from now?

**Evaluates:**
- Neighborhood gentrification trajectory (rent spike risk in next 12 months)
- New development or construction planned nearby
- Local government fiscal health (affects road quality, services)
- School rating trends (affects subletting/resale value even without kids)
- Business opening vs closing trend in the area
- Long-term climate risk for that geography (sea level, heat, fire)
- Upcoming zoning changes

**Tools used:**
- `web_search(query)` — all research here is web-based (news, city planning docs, real estate trend articles)

**Output:** Score 0-100, summary string, detailed findings

---

## Tools & External APIs

All tools are Python functions decorated with `@tool` from LangChain, passed to subagents at instantiation.

### `search_yelp(location, category, term, radius_miles)`
- **API:** Yelp Fusion
- **Returns:** List of businesses with name, distance, rating, review count, price, hours, coordinates
- **Used by:** Food, Lifestyle, Convenience, Building agents

### `get_commute_time(origin, destination, mode, departure_time)`
- **API:** Google Maps Distance Matrix
- **Modes:** `driving` | `transit` | `walking` | `bicycling`
- **Returns:** Duration in minutes, distance in miles
- **Used by:** Transportation agent

### `get_transit_info(address)`
- **API:** Google Maps Directions API (transit mode)
- **Returns:** Available transit lines, frequency estimate, nearest stops
- **Used by:** Transportation agent

### `get_crime_data(zip_code)`
- **API:** SpotCrime
- **Returns:** Crime counts by type for zip, recent incidents
- **Used by:** Safety, Transportation agents

### `get_air_quality(zip_code)`
- **API:** EPA AirNow API
- **Returns:** AQI value, primary pollutant, category (Good/Moderate/Unhealthy)
- **Used by:** Safety agent

### `get_weather_climate(zip_code)`
- **API:** OpenWeatherMap
- **Returns:** Average temp by season, humidity, precipitation
- **Used by:** Utilities agent

### `get_walk_score(address)`
- **API:** Walkscore API
- **Returns:** Walk score, transit score, bike score (0-100 each)
- **Used by:** Transportation, Lifestyle agents

### `web_search(query)`
- **API:** Tavily
- **Returns:** Structured search results with titles, URLs, snippets
- **Used by:** All agents for qualitative research

---

## Frontend Requirements

### Pages

#### 1. Home / Onboarding (`/`)
- If no API key cookie → show `ApiKeyPrompt` component first
- If API key exists but no profile → show `ProfileForm`
- If profile exists → show `AddressInput` ready to evaluate
- Clean landing with brief explanation of what the tool does

#### 2. Profile Setup (`/profile`)
**Fields:**
- Ethnicity / cultural background (free text or select)
- Food preferences (multi-select: Indian, Chinese, Mexican, Italian, Vegan, etc.)
- Exercise routine (select: gym, outdoor running, cycling, none, etc.)
- Outdoor preferences (multi-select: hiking, parks, cycling, none)
- Work schedule (select: 9-5, remote, night shift, irregular)
- Work location address (text input with autocomplete)
- Transportation (radio: I have a car / I don't have a car / I have an EV)
- Household (radio: Solo / Couple / Family with kids)
- Pets (toggle + type if yes)
- Monthly budget (slider or number input)
- Health conditions relevant to proximity (optional free text)
- Priority ranking (drag-and-drop or ordered select of 8 dimensions)

#### 3. Evaluate (`/evaluate`)
- Address input with Google Maps autocomplete
- "Evaluate this property" button
- On submit → switches to streaming progress view
- **AgentProgress component:**
  - Shows 8 agent cards (Safety, Transportation, Food, Lifestyle, Convenience, Utilities, Building, Future Risk)
  - Each card shows: idle → running (spinner) → complete (score badge + one-line summary)
  - Agents complete in parallel, cards update as each finishes
- Once all complete → smooth scroll to full report

#### 4. Report View (inline on `/evaluate` or `/reports/:id`)
**Sections:**
- Overall score (large, prominent, color-coded: red/yellow/green)
- Persona narrative (2-3 paragraph summary written for this specific user)
- Pros list / Cons list / Red flags list (if any)
- Monthly cost breakdown table
- 8 dimension cards — each expandable with full details
- Share button (copies unique report URL)
- Save confirmation (auto-saved, show toast)

#### 5. History (`/history`)
- List of past evaluations: address, date, overall score, status
- Click to open full report
- Delete button per evaluation
- Empty state if no history

### Components

| Component | Purpose |
|---|---|
| `ApiKeyPrompt` | First-time key entry with explanation of why it's needed and how it's stored securely |
| `ProfileForm` | Full profile input form |
| `AddressInput` | Address text input |
| `AgentProgress` | Live streaming progress of 8 subagents |
| `ReportView` | Full report display with all sections |
| `ScoreBadge` | Color-coded score display (0-100) |
| `DimensionCard` | Expandable card per evaluation dimension |
| `CostBreakdown` | Monthly cost estimate table |
| `PastEvaluations` | History list |
| `Toast` | Success/error notifications |

### State Management
- Use React Context or Zustand for global state (session, profile, current evaluation)
- Streaming handled via `EventSource` API connecting to SSE `/evaluate` endpoint

### Streaming Implementation
```typescript
const source = new EventSource('/evaluate', { withCredentials: true });

source.addEventListener('agent_update', (e) => {
  const data = JSON.parse(e.data);
  updateAgentStatus(data.agent, data.status, data.score, data.summary);
});

source.addEventListener('complete', (e) => {
  const data = JSON.parse(e.data);
  setReport(data.report);
  source.close();
});
```

---

## Security Design

### API Key Flow
```
1. User types API key into ApiKeyPrompt
2. Frontend sends key to POST /key
3. Backend encrypts with Fernet(COOKIE_SECRET)
4. Encrypted key set as httpOnly, Secure, SameSite=Strict cookie
5. On every /evaluate request:
   a. Backend reads encrypted_api_key cookie
   b. Decrypts with COOKIE_SECRET
   c. Instantiates DeepAgent with decrypted key
   d. Key used for that request only — not stored anywhere
6. Key never appears in logs, DB, or responses
```

### Session Flow
```
1. On first app load, frontend calls POST /session
2. Backend generates UUID session_id
3. session_id set as httpOnly cookie
4. All subsequent requests read session_id cookie
5. Backend uses session_id to find/create user in DB
```

### Cookie Settings (production)
```python
response.set_cookie(
    key="encrypted_api_key",
    value=encrypted_key,
    httponly=True,
    secure=True,
    samesite="strict",
    max_age=60 * 60 * 24 * 30  # 30 days
)
```

---

## Folder Structure

```
rental-evaluator/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ApiKeyPrompt.tsx
│   │   │   ├── ProfileForm.tsx
│   │   │   ├── AddressInput.tsx
│   │   │   ├── AgentProgress.tsx
│   │   │   ├── ReportView.tsx
│   │   │   ├── ScoreBadge.tsx
│   │   │   ├── DimensionCard.tsx
│   │   │   ├── CostBreakdown.tsx
│   │   │   ├── PastEvaluations.tsx
│   │   │   └── Toast.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── Evaluate.tsx
│   │   │   └── History.tsx
│   │   ├── hooks/
│   │   │   ├── useEvaluation.ts
│   │   │   ├── useSession.ts
│   │   │   └── useProfile.ts
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── crypto.ts
│   │   ├── store/
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── session.py
│   │   │   ├── profile.py
│   │   │   ├── evaluate.py
│   │   │   └── reports.py
│   │   ├── agents/
│   │   │   ├── __init__.py
│   │   │   ├── orchestrator.py
│   │   │   ├── safety.py
│   │   │   ├── transportation.py
│   │   │   ├── food.py
│   │   │   ├── lifestyle.py
│   │   │   ├── convenience.py
│   │   │   ├── utilities.py
│   │   │   ├── building.py
│   │   │   └── future_risk.py
│   │   ├── tools/
│   │   │   ├── __init__.py
│   │   │   ├── yelp.py
│   │   │   ├── google_maps.py
│   │   │   ├── crime.py
│   │   │   ├── weather.py
│   │   │   ├── walkscore.py
│   │   │   └── search.py
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── supabase.py
│   │   │   ├── users.py
│   │   │   ├── evaluations.py
│   │   │   └── cache.py
│   │   └── middleware/
│   │       ├── __init__.py
│   │       ├── auth.py
│   │       └── ratelimit.py
│   ├── requirements.txt
│   └── Dockerfile
│
└── README.md
```

---

## Environment Variables

### Backend (Render)
```env
# Security
COOKIE_SECRET=<32-byte Fernet key>

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=<service role key>

# External APIs
YELP_API_KEY=
GOOGLE_MAPS_API_KEY=
SPOTCRIME_API_KEY=
OPENWEATHER_API_KEY=
EPA_API_KEY=
WALKSCORE_API_KEY=
TAVILY_API_KEY=

# LangSmith
LANGSMITH_API_KEY=
LANGSMITH_PROJECT=rental-evaluator
LANGSMITH_TRACING=true

# App
ENVIRONMENT=production
FRONTEND_URL=https://your-app.vercel.app
RATE_LIMIT_PER_HOUR=10
CACHE_TTL_HOURS=24
```

### Frontend (Vercel)
```env
VITE_API_URL=https://your-backend.onrender.com
```

---

## Deployment

### Backend → Render
1. Push backend folder to GitHub
2. Create new Web Service on Render
3. Connect GitHub repo, set root to `/backend`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add all environment variables in Render dashboard
7. Set up UptimeRobot to ping `https://your-backend.onrender.com/health` every 14 minutes

### Frontend → Vercel
1. Push frontend folder to GitHub
2. Import project in Vercel
3. Framework preset: Vite
4. Root directory: `/frontend`
5. Add `VITE_API_URL` environment variable
6. Deploy

### Database → Supabase
1. Create new Supabase project
2. Run schema SQL in Supabase SQL editor (all tables + indexes + RLS policies above)
3. Copy `SUPABASE_URL` and service role key to Render environment variables

### Generate COOKIE_SECRET
```python
from cryptography.fernet import Fernet
print(Fernet.generate_key().decode())
```
Paste output as `COOKIE_SECRET` in Render.

---

## Notes for Claude Code

- Start with `backend/app/tools/` — build and test each tool wrapper independently before wiring into agents
- Then build `backend/app/agents/` — each subagent is a standalone `create_deep_agent` call with its specific tools and system prompt
- Then build `backend/app/routers/evaluate.py` — SSE streaming endpoint that runs orchestrator and yields events
- Build frontend last — connect to real backend endpoints, not mocks
- Use `langsmith` tracing from the start — it makes debugging agent behavior much easier
- Test each subagent independently before full orchestrator run to validate tools and prompts
- The `neighborhood_cache` table is important — implement it early to avoid burning API quota during development
