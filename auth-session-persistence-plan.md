# Authentication & Session Persistence: Platinum Standard

## Design Goals

1. **No lost work** — If a participant disconnects, their values selections, decisions, and rationales persist
2. **Easy team joining** — Simple codes or links, no complex account setup for participants
3. **Role-based access** — Crucible Master, Team Member, Observer have different capabilities
4. **CM licensing** — Only authorized users can create/manage simulations; supports future monetization
5. **Reconnection during crisis** — Participants can rejoin mid-simulation without disrupting the team
6. **Security without friction** — Protect data and CM controls without creating barriers to engagement

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION LAYER                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │  Clerk (Auth)   │    │  CM Licensing   │    │  Session Store  │  │
│  │                 │    │                 │    │   (Database)    │  │
│  │ • User identity │    │ • License check │    │ • Active sims   │  │
│  │ • JWT tokens    │◄──►│ • Role gating   │◄──►│ • Participants  │  │
│  │ • SSO/Social    │    │ • Usage limits  │    │ • Roles         │  │
│  │ • MFA (optional)│    │ • Admin grants  │    │ • Join codes    │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘  │
│           │                      │                      │            │
│           └──────────────────────┼──────────────────────┘            │
│                                  │                                   │
│                                  ▼                                   │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    ACCESS CONTROL                                ││
│  │  participant: join, participate, view own history                ││
│  │  crucible_master: + create, manage, CM console, debrief reports ││
│  │  admin: + grant/revoke licenses, manage all users                ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                  │                                   │
│                                  ▼                                   │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    REAL-TIME LAYER                               ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             ││
│  │  │  WebSocket  │  │   Presence  │  │   Sync      │             ││
│  │  │  (Socket.io)│  │   Tracking  │  │   Engine    │             ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘             ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Why Clerk (Recommended)

After researching Auth0, NextAuth/Auth.js, Firebase Auth, and Clerk, **Clerk** is the platinum standard for this application because:

| Requirement | Clerk Advantage |
|-------------|-----------------|
| **Fast setup** | Pre-built components, minutes to integrate |
| **Session management** | Built-in session lifecycle, revocation, device management |
| **Security** | OWASP/NIST compliant, SOC 2 Type 2, automatic HIBP password checking |
| **Reconnection** | JWT + session tokens work seamlessly with WebSocket reconnection |
| **Multi-session** | Participants can be in multiple simulations from same browser |
| **Organizations** | Built-in org/team concept maps to simulation teams |
| **User metadata** | publicMetadata perfect for CM license status (instant client-side checks) |
| **Pricing** | Free tier covers 10K MAU (sufficient for MVP) |

**Alternative if self-hosting required:** NextAuth/Auth.js with database adapter + custom session management.

---

## Crucible Master Authorization

### Access Control Model

Not everyone with an account can be a Crucible Master. CM is a privileged role that must be explicitly granted.

```typescript
type UserRole = 'participant' | 'crucible_master' | 'admin';

interface UserAccount {
  id: string;                    // Clerk user ID
  email: string;
  role: UserRole;
  
  // CM-specific fields (only if role === 'crucible_master')
  cmLicense?: {
    type: 'trial' | 'individual' | 'team' | 'enterprise';
    grantedAt: Date;
    expiresAt: Date | null;      // null = perpetual
    grantedBy: string;           // Admin who granted, or 'self_service'
    simulationsCreated: number;
    simulationsLimit: number | null;  // null = unlimited
  };
}

// Role hierarchy
const ROLE_PERMISSIONS = {
  participant: [
    'join_simulation',
    'participate_in_simulation',
    'view_own_history',
  ],
  
  crucible_master: [
    ...ROLE_PERMISSIONS.participant,
    'create_simulation',
    'manage_own_simulations',
    'access_cm_console',
    'generate_join_codes',
    'view_team_data',
    'control_simulation_pace',
    'generate_debrief_reports',
  ],
  
  admin: [
    ...ROLE_PERMISSIONS.crucible_master,
    'grant_cm_license',
    'revoke_cm_license',
    'view_all_simulations',
    'manage_all_users',
    'access_admin_console',
  ],
};
```

### How Someone Becomes a Crucible Master

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CM AUTHORIZATION PATHS                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PATH 1: Admin Grants License                                        │
│  ───────────────────────────────                                     │
│  Admin → User Management → Find User → Grant CM License              │
│  • Used for: Enterprise customers, workshop facilitators             │
│  • License type: Set by admin                                        │
│                                                                      │
│  PATH 2: Self-Service Purchase (Post-MVP)                           │
│  ────────────────────────────────────────                            │
│  User → Pricing Page → Select Plan → Payment → CM License Granted   │
│  • Used for: Individual facilitators, small teams                    │
│  • License type: Based on plan purchased                             │
│                                                                      │
│  PATH 3: Trial Request (MVP)                                        │
│  ───────────────────────────                                         │
│  User → Request Trial → Admin Approves → Trial License Granted       │
│  • Used for: Evaluation, demos                                       │
│  • License type: trial (30 days, 3 simulations)                      │
│                                                                      │
│  PATH 4: Invitation Code                                            │
│  ──────────────────────                                              │
│  Admin creates invite code → User signs up with code → CM License    │
│  • Used for: Workshop cohorts, training programs                     │
│  • License type: Set by invite code configuration                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### License Types

| Type | Simulations | Duration | Use Case |
|------|-------------|----------|----------|
| **trial** | 3 | 30 days | Evaluation |
| **individual** | Unlimited | 1 year | Solo facilitator |
| **team** | Unlimited | 1 year | Organization (5 CMs) |
| **enterprise** | Unlimited | Custom | Large org, custom terms |

### Database Schema Addition

```sql
-- Add to users table (synced from Clerk)
CREATE TABLE user_accounts (
  id VARCHAR(255) PRIMARY KEY,      -- Clerk user ID
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'participant',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CM Licenses
CREATE TABLE cm_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) REFERENCES user_accounts(id),
  license_type VARCHAR(50) NOT NULL,  -- trial, individual, team, enterprise
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,              -- NULL = perpetual
  granted_by VARCHAR(255),             -- Admin user ID or 'self_service'
  simulations_limit INTEGER,           -- NULL = unlimited
  simulations_created INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',         -- For enterprise custom terms
  
  UNIQUE(user_id)                      -- One active license per user
);

-- Invitation codes for CM access
CREATE TABLE cm_invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  license_type VARCHAR(50) NOT NULL,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Track code redemptions
CREATE TABLE cm_invite_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code_id UUID REFERENCES cm_invite_codes(id),
  user_id VARCHAR(255) REFERENCES user_accounts(id),
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cm_licenses_user ON cm_licenses(user_id);
CREATE INDEX idx_cm_licenses_active ON cm_licenses(is_active, expires_at);
CREATE INDEX idx_cm_invite_codes_code ON cm_invite_codes(code);
```

### Authorization Middleware

```typescript
// Protect CM-only routes
async function requireCM(req: Request, res: Response, next: NextFunction) {
  const user = req.auth;  // From Clerk middleware
  
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check if user has valid CM license
  const license = await db.cmLicenses.findFirst({
    where: {
      userId: user.userId,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    }
  });
  
  if (!license) {
    return res.status(403).json({ 
      error: 'Crucible Master license required',
      code: 'CM_LICENSE_REQUIRED',
      action: 'Request a trial or purchase a license'
    });
  }
  
  // Check simulation limit
  if (license.simulationsLimit !== null && 
      license.simulationsCreated >= license.simulationsLimit) {
    return res.status(403).json({
      error: 'Simulation limit reached',
      code: 'CM_LIMIT_REACHED',
      action: 'Upgrade your license for more simulations'
    });
  }
  
  // Attach license to request for downstream use
  req.cmLicense = license;
  next();
}

// Apply to CM routes
app.post('/api/simulations', requireCM, createSimulation);
app.get('/api/simulations/:id/cm', requireCM, getCMDashboard);
app.post('/api/simulations/:id/controls', requireCM, updateSimulationControls);
```

### UI Gating

```typescript
// Client-side: Check CM status before showing controls
interface AuthContext {
  user: User | null;
  isCM: boolean;
  license: CMRateLicense | null;
  isLoading: boolean;
}

function useCMAccess(): AuthContext {
  const { user } = useClerk();
  const [license, setLicense] = useState<CMRateLicense | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (user) {
      fetchCMStatus(user.id)
        .then(setLicense)
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [user]);
  
  return {
    user,
    isCM: !!license && license.isActive,
    license,
    isLoading,
  };
}

// Protected CM routes in Next.js
function CMDashboard() {
  const { isCM, isLoading } = useCMAccess();
  
  if (isLoading) return <Loading />;
  
  if (!isCM) {
    return <CMAccessDenied />;
  }
  
  return <CMDashboardContent />;
}

// CM Access Denied page
function CMAccessDenied() {
  return (
    <div className="access-denied">
      <h1>Crucible Master Access Required</h1>
      <p>
        You need a Crucible Master license to create and manage simulations.
      </p>
      <div className="actions">
        <Button href="/cm/request-trial">Request Trial</Button>
        <Button href="/pricing" variant="secondary">View Pricing</Button>
      </div>
    </div>
  );
}
```

### Navigation Gating

```typescript
// Only show CM navigation items to licensed users
function MainNavigation() {
  const { isCM } = useCMAccess();
  
  return (
    <nav>
      <NavLink href="/join">Join Simulation</NavLink>
      <NavLink href="/my-simulations">My History</NavLink>
      
      {/* CM-only navigation */}
      {isCM && (
        <>
          <Divider />
          <NavLink href="/cm/dashboard">CM Dashboard</NavLink>
          <NavLink href="/cm/create">Create Simulation</NavLink>
          <NavLink href="/cm/templates">My Templates</NavLink>
        </>
      )}
    </nav>
  );
}
```

### Clerk Metadata Integration

Store CM status in Clerk for fast client-side checks:

```typescript
// When granting CM license, also update Clerk metadata
async function grantCMLicense(userId: string, licenseType: string) {
  // 1. Create database record
  const license = await db.cmLicenses.create({
    data: {
      userId,
      licenseType,
      grantedAt: new Date(),
      expiresAt: calculateExpiry(licenseType),
      grantedBy: getCurrentAdminId(),
    }
  });
  
  // 2. Update Clerk user metadata (for fast client-side checks)
  await clerkClient.users.updateUser(userId, {
    publicMetadata: {
      role: 'crucible_master',
      cmLicenseType: licenseType,
      cmLicenseExpires: license.expiresAt?.toISOString() || null,
    }
  });
  
  return license;
}

// Client-side: fast check from Clerk session
function useFastCMCheck() {
  const { user } = useUser();
  
  // This is instant—no API call needed
  const isCM = user?.publicMetadata?.role === 'crucible_master';
  const licenseType = user?.publicMetadata?.cmLicenseType;
  
  return { isCM, licenseType };
}
```

### Security: Preventing CM Control Access

```typescript
// 1. Route protection (server-side)
// All /api/simulations/:id/cm/* routes require CM license
// All /cm/* pages require CM license

// 2. WebSocket room protection
io.on('connection', (socket) => {
  const { participant, simulation } = socket.data;
  
  // Only CM can join CM control room
  socket.on('JOIN_CM_ROOM', async () => {
    if (participant.role !== 'cm') {
      socket.emit('ERROR', { code: 'NOT_CM', message: 'CM access required' });
      return;
    }
    
    // Verify license is still valid
    const license = await verifyCMLicense(participant.clerkUserId);
    if (!license) {
      socket.emit('ERROR', { code: 'LICENSE_INVALID', message: 'CM license expired or revoked' });
      return;
    }
    
    socket.join(`cm:${simulation.id}`);
  });
  
  // All CM control messages check permission
  socket.on('CM_CONTROL', async (action) => {
    if (!socket.rooms.has(`cm:${socket.data.simulation.id}`)) {
      socket.emit('ERROR', { code: 'NOT_IN_CM_ROOM' });
      return;
    }
    
    // Process control action...
  });
});

// 3. Obfuscation (defense in depth)
// CM control endpoints use non-obvious paths
// /api/simulations/:id/cm → /api/s/:id/c
// This isn't security, just reduces casual discovery

// 4. Audit logging
// All CM actions are logged with actor, action, and details
```

### MVP Implementation

For MVP, implement the simplest path:

```typescript
// MVP: Admin manually grants CM licenses
// No self-service, no payment integration yet

// Admin console (simple)
async function grantTrialLicense(adminId: string, userEmail: string) {
  // Find or create user
  let user = await db.userAccounts.findFirst({ where: { email: userEmail } });
  
  if (!user) {
    // User hasn't signed up yet; create pending record
    user = await db.userAccounts.create({
      data: { email: userEmail, role: 'participant' }
    });
  }
  
  // Grant trial license
  return await grantCMLicense(user.id, 'trial');
}

// Seed yourself as admin + CM for development
async function seedDevUser() {
  await db.userAccounts.upsert({
    where: { email: 'jerry@culturewright.com' },
    create: {
      id: 'dev_admin',
      email: 'jerry@culturewright.com',
      role: 'admin'
    },
    update: { role: 'admin' }
  });
  
  await db.cmLicenses.upsert({
    where: { userId: 'dev_admin' },
    create: {
      userId: 'dev_admin',
      licenseType: 'enterprise',
      grantedBy: 'system',
    },
    update: {}
  });
}
```

---

## User Types & Authentication Flows

### 1. Crucible Master (CM)

**Identity requirement:** Full account (email/SSO)
**Session duration:** 7 days (configurable)
**Capabilities:** Create simulations, manage teams, control pacing, access all data

**Flow:**
```
CM visits dashboard
    │
    ▼
┌─────────────────┐
│ Clerk <SignIn/> │ ◄── Email/password, Google, Microsoft SSO
└────────┬────────┘
         │
         ▼
   Session created
         │
         ▼
┌─────────────────┐
│ CM Dashboard    │ ◄── Create simulation, generate team codes
└─────────────────┘
```

### 2. Team Member (Participant)

**Identity requirement:** Anonymous OR lightweight account
**Session duration:** Until simulation ends + 24 hours (for debrief access)
**Capabilities:** Join team, participate in values discovery, make decisions

**Flow (Anonymous - Recommended for workshops):**
```
Participant receives join code/link
    │
    ▼
┌─────────────────────────┐
│ Join Page               │
│ • Enter join code       │
│ • Enter display name    │
│ • No password required  │
└───────────┬─────────────┘
            │
            ▼
   Anonymous session created
   (Clerk anonymous auth OR
    custom session token)
            │
            ▼
┌─────────────────────────┐
│ Pre-Crisis Experience   │ ◄── Values persist to database
└─────────────────────────┘
```

**Flow (Account-linked - For returning participants):**
```
Participant visits dashboard
    │
    ▼
┌─────────────────┐
│ Clerk <SignIn/> │ ◄── Can use magic link (passwordless)
└────────┬────────┘
         │
         ▼
   Full account session
         │
         ▼
┌─────────────────┐
│ My Simulations  │ ◄── Past simulations, values history
└─────────────────┘
```

### 3. Observer

**Identity requirement:** Join code only (read-only access)
**Session duration:** Duration of simulation
**Capabilities:** Watch simulation progress, cannot interact

**Flow:**
```
Observer receives observer code
    │
    ▼
┌─────────────────────────┐
│ Observer Join           │
│ • Enter observer code   │
│ • No name required      │
└───────────┬─────────────┘
            │
            ▼
   Read-only session
            │
            ▼
┌─────────────────────────┐
│ Observer View           │ ◄── Real-time view, no interaction
└─────────────────────────┘
```

---

## Join Code System

### Code Generation

```typescript
interface SimulationCodes {
  simulationId: string;
  
  // Team-specific codes (one per parish)
  teamCodes: {
    parishId: string;
    code: string;           // e.g., "HAVEN-7K3M"
    maxParticipants: number;
    currentParticipants: number;
    expiresAt: Date;
  }[];
  
  // CM admin code
  cmCode: string;            // e.g., "CM-X9R2-K4L8"
  
  // Observer code (optional)
  observerCode?: string;     // e.g., "WATCH-2N5P"
}

function generateTeamCode(parishId: string): string {
  const prefix = parishId.toUpperCase().slice(0, 5);
  const suffix = generateRandomAlphanumeric(4);
  return `${prefix}-${suffix}`;
}

// Examples:
// HAVEN-7K3M
// GATEW-2X9R
// KEYSTO-4N8P
// HEARTL-6M2Q
// SUMMI-3K7L
// STERL-9P4N
```

### Code Properties

| Property | Value | Rationale |
|----------|-------|-----------|
| Length | 9-11 characters | Easy to type, hard to guess |
| Format | PREFIX-XXXX | Parish prefix aids recognition |
| Expiry | Simulation end + 24h | Access for debrief |
| Single-use | No | Multiple participants use same team code |
| Case-sensitive | No | Reduce errors |

### Code Uniqueness Guarantees

```typescript
// Codes must be globally unique across ALL simulations (active and recent)
// This prevents confusion if someone has an old code

async function generateUniqueTeamCode(parishId: string): Promise<string> {
  const maxAttempts = 10;
  
  for (let i = 0; i < maxAttempts; i++) {
    const prefix = parishId.toUpperCase().slice(0, 5);
    const suffix = generateRandomAlphanumeric(4);
    const code = `${prefix}-${suffix}`;
    
    // Check against all codes created in last 30 days
    const exists = await db.teams.findFirst({
      where: {
        joinCode: code,
        createdAt: { gte: subDays(new Date(), 30) }
      }
    });
    
    if (!exists) {
      return code;
    }
  }
  
  // Fallback: use longer suffix
  const prefix = parishId.toUpperCase().slice(0, 5);
  const suffix = generateRandomAlphanumeric(6);
  return `${prefix}-${suffix}`;
}

// Code format validation
const CODE_PATTERNS = {
  team: /^[A-Z]{5,6}-[A-Z0-9]{4,6}$/i,    // HAVEN-7K3M
  cm: /^CM-[A-Z0-9]{4}-[A-Z0-9]{4}$/i,     // CM-X9R2-K4L8
  observer: /^WATCH-[A-Z0-9]{4}$/i,        // WATCH-2N5P
};

function validateCodeFormat(code: string): 'team' | 'cm' | 'observer' | null {
  const normalized = code.toUpperCase().trim();
  
  if (CODE_PATTERNS.cm.test(normalized)) return 'cm';
  if (CODE_PATTERNS.observer.test(normalized)) return 'observer';
  if (CODE_PATTERNS.team.test(normalized)) return 'team';
  
  return null;
}
```

### Shareable Links

In addition to codes, generate direct join links:

```
https://valuescrucible.com/join/HAVEN-7K3M
https://valuescrucible.com/join/CM-X9R2-K4L8
https://valuescrucible.com/observe/WATCH-2N5P
```

---

## Session Persistence Architecture

### What Must Persist

| Data | Storage | Why |
|------|---------|-----|
| User identity | Clerk | Authentication source of truth |
| Simulation state | Database (PostgreSQL) | Survives server restart |
| Team assignments | Database | Reconnection needs to know team |
| Individual values profile | Database | Pre-crisis work must survive disconnect |
| Team values profile | Database | Shared across team |
| Decision history | Database | Core simulation data |
| World state | Database + Redis | Database for persistence, Redis for speed |
| WebSocket connections | In-memory (Redis pub/sub) | Ephemeral, rebuilt on reconnect |

### Database Schema (Key Tables)

```sql
-- Simulations
CREATE TABLE simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'setup', -- setup, pre_crisis, crisis, recovery, debrief, completed
  created_by VARCHAR(255) NOT NULL, -- Clerk user ID
  cm_code VARCHAR(20) UNIQUE NOT NULL,
  observer_code VARCHAR(20) UNIQUE,
  current_time_offset INTEGER DEFAULT -72, -- Simulation hours from landfall
  intensity_level INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}'
);

-- Teams (one per parish per simulation)
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id),
  parish_id VARCHAR(50) NOT NULL,
  join_code VARCHAR(20) UNIQUE NOT NULL,
  is_ai_controlled BOOLEAN DEFAULT FALSE,
  ai_profile JSONB, -- If AI-controlled, the AITeamProfile
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(simulation_id, parish_id)
);

-- Participants
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id),
  team_id UUID REFERENCES teams(id),
  clerk_user_id VARCHAR(255), -- NULL for anonymous participants
  display_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member', -- cm, member, observer
  session_token VARCHAR(255) UNIQUE, -- For anonymous participants
  connected BOOLEAN DEFAULT FALSE,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual Values Profiles
CREATE TABLE individual_values_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id),
  quick_sort_results JSONB, -- Round 1, 2, 3 results
  top_values JSONB, -- Final 5 with definitions
  values_story TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Values Profiles
CREATE TABLE team_values_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  team_values JSONB, -- Array of {value, definition, behaviors}
  commitment_statement TEXT,
  decision_process VARCHAR(50),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decisions
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  dilemma_id VARCHAR(100) NOT NULL,
  simulation_time INTEGER NOT NULL, -- Hours from landfall
  intensity_level INTEGER NOT NULL,
  choice VARCHAR(50) NOT NULL,
  rationale TEXT,
  alignment_scores JSONB, -- Array of {value, score}
  consequences_triggered JSONB,
  decided_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for reconnection queries
CREATE INDEX idx_participants_session_token ON participants(session_token);
CREATE INDEX idx_participants_clerk_user ON participants(clerk_user_id);
CREATE INDEX idx_teams_join_code ON teams(join_code);
CREATE INDEX idx_simulations_cm_code ON simulations(cm_code);
```

### Session Token Strategy

**For authenticated users (CM, returning participants):**
- Clerk JWT (short-lived, ~1 hour)
- Clerk session token (in cookie, 7 days default)
- Automatic refresh via Clerk SDK

**For anonymous participants:**
- Custom session token generated on join
- Stored in HttpOnly, Secure cookie
- Also stored in database for reconnection
- Valid until simulation end + 24 hours

```typescript
interface AnonymousSession {
  sessionToken: string;      // UUID v4
  participantId: string;     // Database participant ID
  simulationId: string;
  teamId: string;
  displayName: string;
  role: 'member' | 'observer';
  createdAt: Date;
  expiresAt: Date;
}

// Cookie settings
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 8, // 8 days (simulation + buffer)
};
```

---

## Reconnection Flow

### Scenario: Participant Disconnects During Crisis

```
┌─────────────────────────────────────────────────────────────────────┐
│ DISCONNECT DETECTED                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. WebSocket connection drops                                       │
│     └── Server marks participant.connected = false                   │
│     └── Server records last_seen_at                                  │
│     └── Team sees "Alex disconnected" indicator                      │
│                                                                      │
│  2. Client detects disconnect                                        │
│     └── Shows "Connection lost. Reconnecting..."                     │
│     └── Starts exponential backoff reconnection                      │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│ RECONNECTION ATTEMPT                                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  3. Client reconnects (new WebSocket)                                │
│     └── Sends session token (from cookie or localStorage backup)     │
│                                                                      │
│  4. Server validates token                                           │
│     └── Lookup participant by session_token                          │
│     └── Verify simulation still active                               │
│     └── Verify team assignment                                       │
│                                                                      │
│  5. Server restores state                                            │
│     └── Fetch current simulation state                               │
│     └── Fetch participant's individual values profile                │
│     └── Fetch team values profile                                    │
│     └── Fetch decision history                                       │
│     └── Fetch current dilemma (if any)                               │
│                                                                      │
│  6. Server sends state sync                                          │
│     └── SYNC_STATE message with all relevant state                   │
│     └── Mark participant.connected = true                            │
│                                                                      │
│  7. Client resumes                                                   │
│     └── Hydrates local state from server                             │
│     └── Resumes at current simulation point                          │
│     └── Team sees "Alex reconnected"                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Reconnection Time Limits

| Simulation Phase | Max Disconnect Time | Behavior if Exceeded |
|------------------|---------------------|---------------------|
| Pre-Crisis | 24 hours | Can still rejoin, resume values work |
| Crisis | 30 minutes | Can rejoin; missed decisions logged as "absent" |
| Recovery | 2 hours | Can rejoin for debrief |
| Debrief | 24 hours | Full access to debrief data |

### State Sync Message

```typescript
interface StateSyncMessage {
  type: 'SYNC_STATE';
  
  // Current position
  simulationPhase: 'pre_crisis' | 'crisis' | 'recovery' | 'debrief';
  simulationTime: number;
  intensityLevel: number;
  
  // Team state
  team: {
    parishId: string;
    members: { id: string; name: string; connected: boolean }[];
    valuesProfile: TeamValuesProfile | null;
    commitment: string | null;
  };
  
  // Individual state
  individual: {
    valuesProfile: IndividualValuesProfile | null;
    valuesStory: string | null;
  };
  
  // Simulation state (if crisis)
  worldState?: {
    weather: WeatherState;
    infrastructure: InfrastructureStatus;
    parishStates: Record<string, ParishState>;
  };
  
  // Current dilemma (if any)
  currentDilemma?: Dilemma;
  
  // Decision history
  decisions: Decision[];
  
  // Pending consequences
  pendingConsequences: string[];
}
```

---

## WebSocket Layer

### Connection Setup

```typescript
// Client-side connection
import { io, Socket } from 'socket.io-client';

interface ConnectionOptions {
  sessionToken: string;      // From cookie or Clerk
  simulationId: string;
  reconnectionAttempts: number;
  reconnectionDelay: number;
  reconnectionDelayMax: number;
}

function createConnection(options: ConnectionOptions): Socket {
  return io(SOCKET_URL, {
    auth: {
      token: options.sessionToken,
      simulationId: options.simulationId,
    },
    reconnection: true,
    reconnectionAttempts: options.reconnectionAttempts || 10,
    reconnectionDelay: options.reconnectionDelay || 1000,
    reconnectionDelayMax: options.reconnectionDelayMax || 30000,
    timeout: 20000,
  });
}

// Event handlers
socket.on('connect', () => {
  console.log('Connected to simulation');
});

socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server kicked us; don't auto-reconnect
    showError('You have been disconnected from the simulation.');
  } else {
    // Connection lost; auto-reconnect will handle it
    showReconnecting();
  }
});

socket.on('SYNC_STATE', (state: StateSyncMessage) => {
  // Hydrate local state
  hydrateSimulationState(state);
});
```

### Server-Side Validation

```typescript
// Server-side connection handler
io.use(async (socket, next) => {
  const { token, simulationId } = socket.handshake.auth;
  
  try {
    // Validate token (Clerk or custom)
    const participant = await validateSessionToken(token);
    
    if (!participant) {
      return next(new Error('Invalid session'));
    }
    
    // Verify participant belongs to simulation
    if (participant.simulationId !== simulationId) {
      return next(new Error('Simulation mismatch'));
    }
    
    // Verify simulation is active
    const simulation = await getSimulation(simulationId);
    if (!simulation || simulation.status === 'completed') {
      return next(new Error('Simulation not active'));
    }
    
    // Attach participant to socket
    socket.data.participant = participant;
    socket.data.simulation = simulation;
    
    // Join rooms
    socket.join(`simulation:${simulationId}`);
    socket.join(`team:${participant.teamId}`);
    
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', async (socket) => {
  const { participant, simulation } = socket.data;
  
  // Mark connected
  await markParticipantConnected(participant.id, true);
  
  // Notify team
  socket.to(`team:${participant.teamId}`).emit('MEMBER_CONNECTED', {
    participantId: participant.id,
    displayName: participant.displayName,
  });
  
  // Send state sync
  const state = await buildStateSyncMessage(participant, simulation);
  socket.emit('SYNC_STATE', state);
  
  // Handle disconnect
  socket.on('disconnect', async () => {
    await markParticipantConnected(participant.id, false);
    socket.to(`team:${participant.teamId}`).emit('MEMBER_DISCONNECTED', {
      participantId: participant.id,
      displayName: participant.displayName,
    });
  });
});
```

---

## Offline Resilience

### Pre-Crisis Offline Mode

Pre-crisis values work is mostly individual—it can happen offline and sync when connection returns.

```typescript
interface OfflineCapability {
  phase: 'pre_crisis' | 'crisis' | 'recovery' | 'debrief';
  canWorkOffline: boolean;
  offlineActivities: string[];
  requiresSync: string[];
}

const OFFLINE_CAPABILITIES: OfflineCapability[] = [
  {
    phase: 'pre_crisis',
    canWorkOffline: true,
    offlineActivities: [
      'values_quick_sort',      // All 3 rounds
      'values_definitions',     // Writing definitions
      'values_story',           // Writing story
    ],
    requiresSync: [
      'team_gallery',           // Needs others' values
      'team_definitions',       // Collaborative
      'commitment_statement',   // Team activity
    ]
  },
  {
    phase: 'crisis',
    canWorkOffline: false,      // Real-time required
    offlineActivities: [],
    requiresSync: ['everything']
  },
  {
    phase: 'recovery',
    canWorkOffline: false,
    offlineActivities: [],
    requiresSync: ['everything']
  },
  {
    phase: 'debrief',
    canWorkOffline: true,       // Can review offline
    offlineActivities: [
      'view_timeline',
      'view_gap_analysis',
      'personal_reflection',
    ],
    requiresSync: [
      'team_discussion',
    ]
  }
];
```

**Offline-first for individual pre-crisis work:**

```typescript
// Service Worker caches the app shell
// IndexedDB stores work-in-progress

interface OfflineValuesWork {
  participantId: string;
  simulationId: string;
  
  // Values Quick Sort (survives offline)
  quickSort: {
    round1?: { kept: string[]; discarded: string[]; timestamp: number };
    round2?: { kept: string[]; discarded: string[]; timestamp: number };
    round3?: { final: string[]; timestamp: number };
  };
  
  // Definitions (survives offline)
  definitions: {
    [value: string]: {
      definition: string;
      livingIt: string[];
      violatingIt: string[];
      timestamp: number;
    };
  };
  
  // Story (survives offline)
  story?: {
    text: string;
    timestamp: number;
  };
  
  // Sync status
  lastSyncedAt: number | null;
  pendingSync: boolean;
}

// On reconnection, sync individual work
async function syncOfflineWork(work: OfflineValuesWork): Promise<SyncResult> {
  const serverState = await fetchServerState(work.participantId);
  
  // Conflict resolution: latest timestamp wins for individual work
  const merged = mergeByTimestamp(work, serverState);
  
  // Push merged state to server
  await pushToServer(merged);
  
  // Update local
  await updateLocalStore(merged);
  
  return { success: true, conflicts: [] };
}
```

### Client-Side State Caching

For additional resilience, cache critical state locally:

```typescript
// Save to localStorage as backup
function cacheLocalState(state: LocalState) {
  try {
    localStorage.setItem(
      `crucible_state_${state.simulationId}`,
      JSON.stringify({
        ...state,
        cachedAt: Date.now(),
      })
    );
  } catch (e) {
    // localStorage might be full or disabled
    console.warn('Could not cache state locally');
  }
}

// Restore from cache if server state unavailable
function restoreFromCache(simulationId: string): LocalState | null {
  try {
    const cached = localStorage.getItem(`crucible_state_${simulationId}`);
    if (!cached) return null;
    
    const state = JSON.parse(cached);
    
    // Check if cache is too old (> 1 hour)
    if (Date.now() - state.cachedAt > 60 * 60 * 1000) {
      localStorage.removeItem(`crucible_state_${simulationId}`);
      return null;
    }
    
    return state;
  } catch (e) {
    return null;
  }
}
```

### Optimistic Updates with Reconciliation

```typescript
// When making a decision during spotty connection
async function submitDecision(decision: Decision) {
  // 1. Optimistic local update
  updateLocalState(decision);
  cacheLocalState(getLocalState());
  
  // 2. Queue for server
  addToSendQueue({
    type: 'DECISION',
    payload: decision,
    timestamp: Date.now(),
  });
  
  // 3. Attempt to send
  try {
    await sendToServer(decision);
    // 4. Mark as synced
    markSynced(decision.id);
  } catch (e) {
    // 5. Will retry on reconnection
    console.log('Decision queued for sync');
  }
}

// On reconnection, reconcile
socket.on('SYNC_STATE', (serverState) => {
  const localQueue = getSendQueue();
  
  for (const item of localQueue) {
    if (!serverState.decisions.find(d => d.id === item.payload.id)) {
      // Server doesn't have this decision; resend
      socket.emit(item.type, item.payload);
    }
  }
  
  // Clear queue
  clearSendQueue();
});
```

---

## Account Linking

Anonymous participants can later link their history to a full account.

### Linking Flow

```
Anonymous participant completes simulation
    │
    ▼
┌─────────────────────────────────────┐
│ Debrief Complete                    │
│                                     │
│ "Want to save your values profile   │
│  and access it later?"              │
│                                     │
│ [Create Account] [Maybe Later]      │
└───────────────┬─────────────────────┘
                │
                ▼ (if Create Account)
┌─────────────────────────────────────┐
│ Clerk Sign-Up                       │
│ • Email/password OR                 │
│ • Google/Microsoft SSO              │
└───────────────┬─────────────────────┘
                │
                ▼
   Link anonymous sessions to account
                │
                ▼
┌─────────────────────────────────────┐
│ My Profile                          │
│ • Past simulations                  │
│ • Values history over time          │
│ • Gap analysis trends               │
└─────────────────────────────────────┘
```

### Database Support

```sql
-- Participants can have anonymous session OR clerk user OR both (linked)
ALTER TABLE participants ADD COLUMN linked_at TIMESTAMPTZ;

-- When linking, we keep the anonymous record but add the clerk_user_id
UPDATE participants 
SET clerk_user_id = 'user_xxx', linked_at = NOW()
WHERE session_token = 'anonymous_token_xxx';

-- Query all simulations for a user (including pre-linking anonymous ones)
SELECT s.* FROM simulations s
JOIN participants p ON p.simulation_id = s.id
WHERE p.clerk_user_id = 'user_xxx'
ORDER BY s.created_at DESC;
```

### Privacy: Right to Remain Anonymous

Some participants may not want their values work linked to identity. Respect this:

```typescript
interface ParticipantPrivacySettings {
  allowLinking: boolean;          // Can this session be linked later?
  allowResearchUse: boolean;      // Can anonymized data be used for research?
  deleteAfterDays: number | null; // Auto-delete after N days (null = keep)
}

// Default: allow linking, allow research, keep forever
const DEFAULT_PRIVACY: ParticipantPrivacySettings = {
  allowLinking: true,
  allowResearchUse: true,
  deleteAfterDays: null,
};
```

---

## CM Authority & Handoff

### What Happens if CM Disconnects?

```typescript
interface CMAuthorityState {
  primaryCM: {
    participantId: string;
    connected: boolean;
    lastSeenAt: Date;
  };
  
  backupCMs: {
    participantId: string;
    connected: boolean;
    canTakeOver: boolean;
  }[];
  
  // If all CMs disconnected
  autoPilot: {
    enabled: boolean;
    maxDuration: number;  // Minutes before pausing simulation
  };
}
```

### Authority Handoff Rules

| Scenario | Behavior |
|----------|----------|
| Primary CM disconnects < 2 min | Simulation continues; primary auto-reconnects |
| Primary CM disconnects > 2 min | Backup CM prompted to take over |
| All CMs disconnected < 5 min | Simulation continues on autopilot |
| All CMs disconnected > 5 min | Simulation pauses with message to teams |
| Primary CM reconnects after handoff | Becomes backup; must request control back |

### Autopilot Mode

When no CM is connected, simulation can continue in limited autopilot:

```typescript
interface AutopilotConfig {
  // What autopilot CAN do
  canAdvanceTimeline: true,
  canPresentDilemmas: true,      // Pre-generated or AI-generated
  canAcceptDecisions: true,
  
  // What autopilot CANNOT do
  canAdjustIntensity: false,
  canInjectEvents: false,
  canOverrideAI: false,
  canEndSimulation: false,
  
  // Safeguards
  maxAutopilotMinutes: 15,       // Pause after 15 min without CM
  notifyParticipants: true,      // "CM temporarily unavailable"
}
```

---

## Multi-Tab / Multi-Window Handling

Participants might open multiple tabs. This causes problems:
- Duplicate WebSocket connections
- State divergence
- Confusion about which tab is "active"

### Solution: Leader Election

```typescript
// Use BroadcastChannel API for cross-tab communication
const channel = new BroadcastChannel('crucible_session');

interface TabState {
  tabId: string;
  isLeader: boolean;
  lastActivity: number;
}

class TabCoordinator {
  private tabId = crypto.randomUUID();
  private isLeader = false;
  private channel: BroadcastChannel;
  
  constructor() {
    this.channel = new BroadcastChannel('crucible_session');
    this.channel.onmessage = this.handleMessage.bind(this);
    this.electLeader();
  }
  
  private electLeader() {
    // Announce presence
    this.channel.postMessage({ type: 'ANNOUNCE', tabId: this.tabId });
    
    // Wait for responses
    setTimeout(() => {
      if (!this.isLeader) {
        // If no leader responded, become leader
        this.becomeLeader();
      }
    }, 100);
  }
  
  private becomeLeader() {
    this.isLeader = true;
    this.channel.postMessage({ type: 'LEADER_ELECTED', tabId: this.tabId });
    // Only leader maintains WebSocket connection
    this.initializeWebSocket();
  }
  
  private handleMessage(event: MessageEvent) {
    const { type, tabId } = event.data;
    
    switch (type) {
      case 'ANNOUNCE':
        if (this.isLeader) {
          // Tell new tab that we're the leader
          this.channel.postMessage({ type: 'LEADER_EXISTS', leaderId: this.tabId });
        }
        break;
        
      case 'LEADER_EXISTS':
        // Another tab is leader; become follower
        this.isLeader = false;
        this.followLeader(tabId);
        break;
        
      case 'STATE_UPDATE':
        // Leader broadcasting state to followers
        if (!this.isLeader) {
          this.updateLocalState(event.data.state);
        }
        break;
    }
  }
  
  // Followers show "This session is active in another tab"
  // with option to "Use this tab instead"
  private followLeader(leaderId: string) {
    showFollowerUI(leaderId);
  }
}
```

### User Experience

**Follower tab shows:**
```
┌─────────────────────────────────────────────┐
│                                             │
│  This simulation is open in another tab.    │
│                                             │
│  [Switch to Active Tab]  [Use This Tab]     │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Presence & Heartbeat

### Detecting "Really There" vs Zombie Connections

```typescript
interface PresenceConfig {
  heartbeatInterval: 30_000,      // Client sends heartbeat every 30s
  heartbeatTimeout: 90_000,       // Server marks disconnected after 90s silence
  activityTimeout: 300_000,       // Mark "idle" after 5 min no activity
}

// Client-side heartbeat
class PresenceManager {
  private heartbeatInterval: NodeJS.Timeout;
  private lastActivity: number = Date.now();
  
  start(socket: Socket) {
    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      socket.emit('HEARTBEAT', {
        timestamp: Date.now(),
        isActive: this.isUserActive(),
      });
    }, 30_000);
    
    // Track user activity
    ['mousemove', 'keydown', 'click', 'scroll'].forEach(event => {
      document.addEventListener(event, () => {
        this.lastActivity = Date.now();
      });
    });
  }
  
  private isUserActive(): boolean {
    return Date.now() - this.lastActivity < 300_000; // 5 minutes
  }
}

// Server-side presence tracking
interface ParticipantPresence {
  participantId: string;
  socketId: string;
  status: 'active' | 'idle' | 'disconnected';
  lastHeartbeat: Date;
  lastActivity: Date;
}

// Team sees presence indicators
// ● Alex (active)
// ◐ Jordan (idle - 3 min)
// ○ Sam (disconnected)
```

### Presence in Team UI

```typescript
interface TeamMemberDisplay {
  name: string;
  status: 'active' | 'idle' | 'disconnected';
  idleDuration?: number;  // Minutes idle
  disconnectedAt?: Date;
}

// UI shows:
// During crisis, "idle" members don't block team decisions
// But their participation is logged for debrief
```

---

## Mobile Considerations

Mobile browsers and apps have unique challenges:
- App backgrounding kills WebSocket
- Battery optimization may throttle connections
- Screen lock suspends JavaScript

### Background Handling

```typescript
// Detect app going to background
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    // App backgrounded
    handleBackgrounded();
  } else {
    // App foregrounded
    handleForegrounded();
  }
});

function handleBackgrounded() {
  // 1. Save state to localStorage immediately
  saveStateToLocalStorage();
  
  // 2. Mark last known position
  localStorage.setItem('crucible_last_position', JSON.stringify({
    simulationTime: currentSimulationTime,
    phase: currentPhase,
    timestamp: Date.now(),
  }));
  
  // 3. WebSocket will die; that's okay
}

function handleForegrounded() {
  // 1. Check how long we were backgrounded
  const lastPosition = JSON.parse(localStorage.getItem('crucible_last_position'));
  const backgroundDuration = Date.now() - lastPosition.timestamp;
  
  if (backgroundDuration < 30_000) {
    // Less than 30 seconds: probably still connected
    // Just refresh state
    requestStateSync();
  } else {
    // Longer: assume disconnected, do full reconnection
    fullReconnect();
  }
}
```

### Mobile-Optimized Reconnection

```typescript
const MOBILE_RECONNECT_CONFIG = {
  // More aggressive initial retry (mobile networks are flaky)
  reconnectionDelay: 500,
  reconnectionDelayMax: 10_000,  // Cap at 10s (vs 30s for desktop)
  
  // More attempts (users expect mobile to "just work")
  reconnectionAttempts: 20,
  
  // Show reconnection status prominently
  showReconnectingUI: true,
  
  // Offer manual reconnect button
  showManualReconnect: true,
};
```

### Push Notifications (Optional Enhancement)

For important events during crisis (when app is backgrounded):

```typescript
// Request permission on join
async function setupPushNotifications() {
  if ('Notification' in window && 'serviceWorker' in navigator) {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Register for push
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_PUBLIC_KEY,
      });
      
      // Send subscription to server
      await registerPushSubscription(subscription);
    }
  }
}

// Server sends push for critical events
const PUSH_WORTHY_EVENTS = [
  'DILEMMA_REQUIRES_YOUR_INPUT',  // Team waiting for you
  'SIMULATION_PAUSED',            // CM paused
  'TEAM_MADE_DECISION',           // You were idle; FYI
];
```

---

## WebSocket Scaling

Single server limits concurrent simulations. For production scale:

### Horizontal Scaling with Redis

```typescript
// Use Socket.io Redis adapter for multi-server
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));

// Now multiple server instances share:
// - Room membership
// - Broadcast messages
// - Presence state
```

### Architecture for Scale

```
┌─────────────────────────────────────────────────────────────────┐
│                        LOAD BALANCER                             │
│                    (sticky sessions by simulation_id)            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    ┌───────────┐   ┌───────────┐   ┌───────────┐
    │ Server 1  │   │ Server 2  │   │ Server 3  │
    │ (WS + API)│   │ (WS + API)│   │ (WS + API)│
    └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
          │               │               │
          └───────────────┼───────────────┘
                          │
                          ▼
                    ┌───────────┐
                    │   Redis   │ ◄── Pub/Sub for cross-server messaging
                    │ (Cluster) │ ◄── Session cache
                    └─────┬─────┘     Presence state
                          │
                          ▼
                    ┌───────────┐
                    │ PostgreSQL│ ◄── Source of truth for all persistent data
                    │ (Primary) │
                    └───────────┘
```

### Sticky Sessions

Participants in the same simulation should hit the same server when possible:

```typescript
// Nginx configuration for sticky sessions
// upstream crucible_servers {
//   ip_hash;  // Simple: route by IP
//   # OR use cookie-based stickiness
//   sticky cookie srv_id expires=1h domain=.valuescrucible.com path=/;
//   
//   server server1:3000;
//   server server2:3000;
//   server server3:3000;
// }

// Better: route by simulation_id
// This keeps all participants in a simulation on the same server
// reducing cross-server pub/sub traffic
```

### Capacity Planning

| Metric | Single Server | With Scaling |
|--------|---------------|--------------|
| Concurrent simulations | 20-30 | 200+ |
| Participants per simulation | 50 | 50 |
| Total concurrent participants | ~1,000 | ~10,000 |
| WebSocket connections | ~1,000 | ~10,000 |

---

## State Reconciliation

### When Client and Server Disagree

```typescript
interface StateReconciliation {
  // Server is source of truth for:
  authoritative: [
    'simulation_time',
    'intensity_level', 
    'team_values_profile',
    'decision_history',
    'world_state',
    'dilemma_state',
  ];
  
  // Client can have optimistic state for:
  optimistic: [
    'individual_values_work_in_progress',
    'current_input_fields',
    'ui_state',
  ];
  
  // On conflict:
  resolution: {
    authoritative: 'server_wins',
    optimistic: 'merge_by_timestamp',
  };
}

async function reconcileState(
  clientState: ClientState,
  serverState: ServerState
): Promise<ReconciledState> {
  const reconciled: ReconciledState = {};
  
  // Server wins for authoritative state
  reconciled.simulationTime = serverState.simulationTime;
  reconciled.intensityLevel = serverState.intensityLevel;
  reconciled.teamValuesProfile = serverState.teamValuesProfile;
  reconciled.decisions = serverState.decisions;
  
  // Merge individual work by timestamp
  reconciled.individualWork = mergeByTimestamp(
    clientState.individualWork,
    serverState.individualWork
  );
  
  // Check for impossible states
  if (reconciled.decisions.length < clientState.decisions.length) {
    // Client has decisions server doesn't know about
    // This shouldn't happen; log for investigation
    logAnomaly('decision_count_mismatch', { clientState, serverState });
    
    // Re-submit missing decisions
    const missing = findMissingDecisions(clientState.decisions, serverState.decisions);
    for (const decision of missing) {
      await resubmitDecision(decision);
    }
  }
  
  return reconciled;
}
```

### Corruption Recovery

If state becomes irrecoverably corrupted:

```typescript
async function attemptRecovery(participantId: string): Promise<RecoveryResult> {
  // 1. Try to load from database (source of truth)
  const dbState = await loadFromDatabase(participantId);
  
  if (dbState) {
    return { success: true, state: dbState, source: 'database' };
  }
  
  // 2. Try to load from Redis cache
  const cacheState = await loadFromCache(participantId);
  
  if (cacheState) {
    // Restore to database
    await saveToDatabase(cacheState);
    return { success: true, state: cacheState, source: 'cache' };
  }
  
  // 3. Try to load from client localStorage
  // (Client sends this on reconnection attempt)
  // Already handled in reconnection flow
  
  // 4. If all else fails
  return { 
    success: false, 
    error: 'state_unrecoverable',
    options: ['rejoin_as_new', 'contact_cm']
  };
}
```

---

## Observer Sync Strategy

Observers don't interact, so they need different sync:

```typescript
interface ObserverSyncConfig {
  // Observers get batched updates, not real-time
  updateInterval: 5_000,          // Every 5 seconds
  
  // Skip intermediate state
  skipIntermediateState: true,    // Don't show typing, just final
  
  // Reduced data
  excludeFromSync: [
    'individual_values_in_progress',
    'team_chat',
    'decision_rationale_drafts',
  ],
  
  // Include summaries
  includeInSync: [
    'current_phase',
    'simulation_time',
    'team_decisions',              // Final only
    'dilemma_outcomes',
    'notable_moments',
  ];
}

// Observer WebSocket is simpler
class ObserverConnection {
  private syncInterval: NodeJS.Timeout;
  
  start(socket: Socket, simulationId: string) {
    // Join observer room (separate from participant rooms)
    socket.join(`observer:${simulationId}`);
    
    // Receive batched updates
    socket.on('OBSERVER_UPDATE', (update: ObserverUpdate) => {
      this.renderUpdate(update);
    });
  }
}

// Server batches updates for observers
class ObserverBroadcaster {
  private pendingUpdates: Map<string, ObserverUpdate[]> = new Map();
  
  constructor() {
    // Flush updates every 5 seconds
    setInterval(() => this.flushUpdates(), 5_000);
  }
  
  queueUpdate(simulationId: string, update: ObserverUpdate) {
    const queue = this.pendingUpdates.get(simulationId) || [];
    queue.push(update);
    this.pendingUpdates.set(simulationId, queue);
  }
  
  private flushUpdates() {
    for (const [simulationId, updates] of this.pendingUpdates) {
      // Compress updates (e.g., only latest state, not all intermediate)
      const compressed = this.compressUpdates(updates);
      
      // Broadcast to observers
      io.to(`observer:${simulationId}`).emit('OBSERVER_UPDATE', compressed);
    }
    
    this.pendingUpdates.clear();
  }
}
```

---

## Data Retention & Privacy

### Retention Policy

```typescript
interface DataRetentionPolicy {
  // Active simulation data
  activeSimulation: 'keep_until_completed',
  
  // Completed simulations
  completedSimulation: {
    withLinkedAccounts: '2_years',      // Users can delete earlier
    anonymousParticipants: '90_days',   // Auto-delete after 90 days
    cmCreated: '2_years',               // CM account retention
  };
  
  // Sensitive data
  valuesProfiles: {
    linkedToAccount: 'until_user_deletes',
    anonymous: '90_days',
  };
  
  // Audit logs
  auditLogs: '7_years',                  // Regulatory requirement
}
```

### GDPR Compliance

```typescript
interface GDPRCompliance {
  // Right to access
  exportData: async (userId: string) => {
    return {
      profile: await exportUserProfile(userId),
      simulations: await exportSimulationHistory(userId),
      values: await exportValuesProfiles(userId),
      decisions: await exportDecisionHistory(userId),
    };
  };
  
  // Right to deletion
  deleteData: async (userId: string) => {
    // Anonymize rather than delete (preserve research value)
    await anonymizeParticipant(userId);
    // Delete PII
    await deleteUserPII(userId);
    // Revoke sessions
    await revokeAllSessions(userId);
  };
  
  // Right to portability
  exportFormat: 'JSON',
  
  // Consent tracking
  consentRequired: ['data_processing', 'research_use'],
  consentOptional: ['marketing'],
}

// Anonymization preserves research value
async function anonymizeParticipant(userId: string) {
  await db.participants.updateMany({
    where: { clerkUserId: userId },
    data: {
      displayName: `Participant_${generateAnonymousId()}`,
      clerkUserId: null,
      sessionToken: null,
      // Keep: valuesProfile, decisions, alignmentScores
    }
  });
}
```

### Data Minimization

```typescript
// Only collect what's needed
interface MinimalParticipantData {
  // Required
  displayName: string;              // Can be pseudonym
  teamId: string;
  
  // Values work (core to simulation)
  valuesProfile: ValuesProfile;
  decisions: Decision[];
  
  // NOT collected
  // email: string;                 // Only if they create account
  // realName: string;              // Never required
  // location: string;              // Not needed
  // deviceInfo: string;            // Only for debugging, not stored
}
```

---

## Error States & User Experience

### Error Taxonomy

```typescript
type ErrorSeverity = 'recoverable' | 'blocking' | 'fatal';

interface UserFacingError {
  code: string;
  severity: ErrorSeverity;
  userMessage: string;
  userAction: string;
  technicalDetails?: string;  // Only in dev/debug mode
}

const ERROR_CATALOG: Record<string, UserFacingError> = {
  // Authentication errors
  'AUTH_INVALID_CODE': {
    code: 'AUTH_INVALID_CODE',
    severity: 'recoverable',
    userMessage: "That code doesn't look right.",
    userAction: "Check the code and try again. Codes look like HAVEN-7K3M.",
  },
  'AUTH_CODE_EXPIRED': {
    code: 'AUTH_CODE_EXPIRED',
    severity: 'blocking',
    userMessage: "This simulation has ended.",
    userAction: "Contact your facilitator for a new code if needed.",
  },
  'AUTH_TEAM_FULL': {
    code: 'AUTH_TEAM_FULL',
    severity: 'blocking',
    userMessage: "This team is full.",
    userAction: "Contact your facilitator to be assigned to another team.",
  },
  
  // Connection errors
  'CONN_LOST': {
    code: 'CONN_LOST',
    severity: 'recoverable',
    userMessage: "Connection lost. Reconnecting...",
    userAction: "Your work is saved. We'll reconnect automatically.",
  },
  'CONN_FAILED_FINAL': {
    code: 'CONN_FAILED_FINAL',
    severity: 'blocking',
    userMessage: "Unable to reconnect.",
    userAction: "Your work is saved. Click 'Reconnect' or refresh the page.",
  },
  
  // State errors
  'STATE_CONFLICT': {
    code: 'STATE_CONFLICT',
    severity: 'recoverable',
    userMessage: "Your teammate just updated this. Refreshing...",
    userAction: "Review the latest version.",
  },
};
```

### Reconnection UI Flow

```
Normal State → Connection drops → Toast: "Reconnecting..." 
    → Still trying after 10s → "Attempt 4 of 10. Check internet."
    → All retries fail → Modal: "Unable to reconnect" with [Retry] [Refresh]
    → Success at any point → Toast dismisses, resume normally
```

---

## Team Decision Coordination

During crisis, teams must agree on decisions. How?

### Decision Modes

```typescript
type DecisionMode = 
  | 'facilitator_submits'    // Team lead clicks submit after discussion
  | 'majority_vote'          // Democratic voting
  | 'first_responder';       // First person to submit wins (time pressure)

// Default: facilitator_submits (mirrors real organizational dynamics)
```

### Facilitator Submits Mode (Default)

- Dilemma presented to all team members
- Team discusses (voice/chat outside system)
- Any member can "suggest" an option
- Team lead submits final decision
- If team lead disconnects > 1 min, next member promoted

### Simultaneous Action Handling

```typescript
// What if two people click submit at the same time?
// Server-side: first valid submission wins (database transaction)

async function submitDecision(teamId, dilemmaId, choice, submittedBy) {
  return await db.$transaction(async (tx) => {
    const existing = await tx.decisions.findFirst({
      where: { teamId, dilemmaId }
    });
    
    if (existing) {
      return { success: false, reason: 'already_submitted' };
    }
    
    return { success: true, decision: await tx.decisions.create({...}) };
  });
}

// Second submitter sees: "Your teammate just submitted."
```

---

## Graceful Degradation

### Clerk Down

```typescript
// If Clerk API is down:
// ✅ Can: validate existing JWTs (local validation with cached public key)
// ✅ Can: anonymous participant joins (our own tokens)
// ✅ Can: continue active simulations
// ❌ Cannot: new CM logins, new account creation

// Fallback: local JWT validation with cached public key
async function validateJWT(token: string) {
  try {
    return await clerkClient.verifyToken(token);
  } catch (e) {
    if (isNetworkError(e)) {
      return localJWTValidation(token, CACHED_CLERK_PUBLIC_KEY);
    }
    throw e;
  }
}
```

### Redis Down

```typescript
// If Redis is down:
// - Fall back to database for session cache (slower)
// - Single-server mode (no cross-server sync)
// - Presence tracking via WebSocket only

async function getSession(token: string) {
  try {
    const cached = await redis.get(`session:${token}`);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    logWarning('redis_unavailable', e);
  }
  // Fall back to database
  return await db.participants.findFirst({ where: { sessionToken: token } });
}
```

### Database Down (Critical)

```typescript
// If database is down:
// - Keep active simulations running in memory
// - Queue writes for when DB returns (max 1 hour)
// - Show user: "Experiencing issues saving. Continue—we'll sync when resolved."
// - Alert ops immediately
```

---

## Rate Limiting

```typescript
const RATE_LIMITS = {
  'POST /api/join': {
    windowMs: 60_000,        // 1 minute
    maxRequests: 10,
    message: "Too many join attempts. Wait a minute.",
  },
  'POST /api/simulations': {
    windowMs: 3600_000,      // 1 hour
    maxRequests: 10,
    message: "You've created many simulations recently.",
  },
  websocket: {
    messagesPerSecond: 10,
    burstAllowance: 50,
  },
  ipBased: {
    windowMs: 60_000,
    maxRequests: 100,
    skipSuccessfulAuth: true,
  },
};
```

---

## Audit Logging

```typescript
type AuditAction = 
  | 'AUTH_LOGIN' | 'AUTH_JOIN_CODE_USED'
  | 'SIM_CREATED' | 'SIM_STARTED' | 'SIM_COMPLETED'
  | 'TEAM_DECISION_SUBMITTED' | 'TEAM_VALUES_UPDATED'
  | 'CM_OVERRIDE_AI' | 'CM_FORCE_DECISION'
  | 'SYSTEM_ERROR' | 'SYSTEM_RECONNECTION';

interface AuditLog {
  timestamp: Date;
  actorType: 'participant' | 'cm' | 'system' | 'ai';
  actorId: string;
  action: AuditAction;
  resourceId: string;
  details: Record<string, unknown>;
  simulationId?: string;
  ipAddress: string;  // Hashed for privacy
}

// Retention: 7 years for decisions, 90 days for system events
// Alert on: CM force decisions, high error rates
```

---

## Monitoring & Alerting

```typescript
// Key metrics
const METRICS = {
  'websocket.latency': { alertThreshold: 500 },      // ms
  'api.response_time': { alertThreshold: 1000 },     // ms
  'errors.rate': { alertThreshold: 10 },             // per minute
  'reconnections.rate': { alertThreshold: 50 },      // per minute
  'active.simulations': {},
  'active.participants': {},
};

// Health check: GET /api/health
// Returns: { status, dependencies: { database, redis, clerk }, metrics }

// Alert channels by severity
// critical (DB down): PagerDuty + Slack
// high (Redis down): Slack + email
// medium (elevated latency): Slack
```

---

## Security Considerations

### OWASP Compliance

| OWASP Requirement | Implementation |
|-------------------|----------------|
| Session ID regeneration | Clerk handles automatically |
| Secure cookie flags | HttpOnly, Secure, SameSite=Lax |
| Session timeout | Configurable via Clerk (default 7 days) |
| Session revocation | Clerk dashboard + API |
| HTTPS only | Enforced at infrastructure level |
| CSRF protection | Clerk + SameSite cookies |

### Attack Mitigation

| Attack | Mitigation |
|--------|------------|
| Session hijacking | HttpOnly cookies, HTTPS only |
| Session fixation | Token regeneration on auth state change |
| XSS | No tokens in JavaScript-accessible storage for auth users |
| CSRF | SameSite cookies, Clerk's built-in protection |
| Brute force | Rate limiting on join code attempts |
| Code enumeration | Rate limiting, monitoring for patterns |

### Rate Limiting

```typescript
const RATE_LIMITS = {
  joinCode: {
    windowMs: 60 * 1000,     // 1 minute
    maxAttempts: 10,         // 10 attempts per minute
  },
  createSimulation: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 10,          // 10 simulations per hour
  },
  websocketMessages: {
    windowMs: 1000,           // 1 second
    maxAttempts: 50,          // 50 messages per second
  },
};
```

---

## Implementation Checklist

### Phase 1: Core Auth (Week 1)
- [ ] Clerk integration and configuration
- [ ] CM sign-up/sign-in flow with SSO support
- [ ] Database schema creation (all tables including cm_licenses)
- [ ] Join code generation with uniqueness guarantees
- [ ] Code validation and format checking

### Phase 2: CM Authorization (Week 1)
- [ ] User accounts table synced with Clerk
- [ ] CM licenses table and queries
- [ ] requireCM middleware for API routes
- [ ] Clerk metadata sync for fast client checks
- [ ] Admin seed script for development
- [ ] Trial license granting (admin console)

### Phase 3: Anonymous Participants (Week 2)
- [ ] Join page UI (code + display name)
- [ ] Anonymous session token generation
- [ ] Session token cookie handling (HttpOnly, Secure)
- [ ] Participant database records
- [ ] Account linking flow (anonymous → full account)

### Phase 4: Session Persistence (Week 2)
- [ ] Individual values profile storage
- [ ] Team values profile storage
- [ ] Decision history storage with optimistic locking
- [ ] World state persistence
- [ ] Offline-first for pre-crisis (IndexedDB + Service Worker)

### Phase 5: Real-Time Layer (Week 3)
- [ ] WebSocket server setup (Socket.io)
- [ ] Connection authentication (JWT + custom tokens)
- [ ] Room management (simulation, team, observer, CM)
- [ ] CM room protection (license verification)
- [ ] Presence tracking with heartbeat
- [ ] Multi-tab coordination (leader election)

### Phase 6: Reconnection (Week 3-4)
- [ ] Disconnect detection and UI feedback
- [ ] State sync message building
- [ ] Client-side reconnection with exponential backoff
- [ ] Local state caching (localStorage backup)
- [ ] State reconciliation on reconnect
- [ ] Mobile background/foreground handling

### Phase 7: Team Coordination (Week 4)
- [ ] Team lead assignment and failover
- [ ] Decision submission flow (facilitator mode)
- [ ] Simultaneous action handling
- [ ] Team presence indicators

### Phase 8: Resilience (Week 5)
- [ ] Graceful degradation (Clerk, Redis, DB fallbacks)
- [ ] Write queue for database outages
- [ ] Rate limiting implementation
- [ ] Error state UI (toasts, modals, full-page)

### Phase 9: Operations (Week 5-6)
- [ ] Audit logging implementation
- [ ] Health check endpoint
- [ ] Monitoring metrics (latency, errors, connections)
- [ ] Alerting configuration
- [ ] Redis adapter for horizontal scaling

### Post-MVP: Monetization
- [ ] Pricing page
- [ ] Stripe integration
- [ ] Self-service license purchase
- [ ] License upgrade flow
- [ ] Usage tracking and limits
- [ ] Invoice generation

---

## Summary

**The platinum standard** for Values Crucible authentication and session persistence:

1. **Clerk for authentication** — Managed auth with best practices built in
2. **CM licensing system** — Only authorized users can create simulations
3. **Anonymous sessions for participants** — Low friction, just a code and name
4. **Database-backed state** — Everything important persists
5. **WebSocket with auto-reconnection** — Real-time with graceful degradation
6. **Join codes** — Simple sharing, easy joining
7. **Offline-first pre-crisis** — Individual work survives any connection issue
8. **Multi-tab coordination** — No duplicate connections or state divergence
9. **Team decision coordination** — Clear flow for who submits decisions
10. **Graceful degradation** — Works even when dependencies fail
11. **OWASP-compliant security** — HttpOnly cookies, HTTPS, rate limiting

**Access Control Model:**
- **Participants** — Can join simulations, participate, view own history
- **Crucible Masters** — Licensed users who can create/manage simulations
- **Admins** — Can grant/revoke CM licenses, manage all users

**CM License Types (Post-MVP Monetization):**
| Type | Simulations | Duration | Use Case |
|------|-------------|----------|----------|
| trial | 3 | 30 days | Evaluation |
| individual | Unlimited | 1 year | Solo facilitator |
| team | Unlimited | 1 year | Organization (5 CMs) |
| enterprise | Unlimited | Custom | Large org |

**Key user experience:**
- Admin grants CM license → CM creates simulation → gets team codes → shares
- Participants enter code + name → immediately in simulation
- If disconnected → auto-reconnect → resume exactly where they were
- Values work NEVER lost — persisted to database + cached locally
- Non-CMs never see CM controls — clean separation of concerns
