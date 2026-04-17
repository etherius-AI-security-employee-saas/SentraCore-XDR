# SentraCore XDR Dashboard Tutorial

## What this product is right now

SentraCore XDR currently runs as a local multi-tenant SOC demo platform.

That means:

- one local machine runs the frontend, backend, and AI engine
- the dashboard shows demo tenants, demo users, demo alerts, and demo attack data
- you can test threat scenarios from the dashboard
- it is good for demos, product presentation, and local testing

That also means:

- it is **not yet** a real employee agent rollout product
- it does **not yet** auto-connect employee machines to one manager account
- it does **not yet** have a manager login, employee login, or enrollment key workflow
- it does **not yet** install an endpoint agent on every employee device

## What happens when you run setup

When you run `Setup SentraCore XDR.cmd`, it:

1. creates the local Python virtual environment
2. installs backend dependencies
3. installs AI engine dependencies
4. installs frontend dependencies
5. creates launcher shortcuts
6. starts the local platform automatically

After setup, the GUI opens in the browser at:

`http://127.0.0.1:5173`

## What the dashboard is showing you

The dashboard is a security operations view.
It is designed for a security manager, SOC analyst, or admin to monitor users and attack activity.

The app has these main sections:

### 1. Dashboard

This is the main overview page.

It shows:

- `Global Risk Score`
  the average current risk across the selected tenant
- `Critical Alerts`
  how many high-priority issues need attention
- `Highest-Risk User`
  the person currently at the top of the risk ranking
- `Zero Trust Mode`
  whether the selected tenant is running strict or adaptive verification logic

Below that, it also shows:

- risk trend chart
- threat category chart
- live threat feed
- activity distribution
- AI insight cards
- user risk ranking
- activity heatmap
- attack replay mode

### 2. Alerts

This page lists alert records for the selected tenant.

Use it to answer:

- what happened
- how severe it is
- which user is affected
- what category the alert belongs to

### 3. Users

This page ranks users by risk score.

Use it to answer:

- which employee looks most suspicious
- what their last important event was
- what their main risk signal is
- how much their risk increased or decreased

### 4. Threat Intelligence

This page shows indicators and AI summaries.

Use it to answer:

- which domains, IPs, or tactics look dangerous
- what the confidence is
- what the system believes about those indicators

### 5. Attack Timeline

This page shows replay-style attack sequences.

Use it to answer:

- how the attack unfolded
- what happened first, next, and last
- which user journey was affected

### 6. Settings

This page shows platform and RBAC information.

Use it to answer:

- what environment you are running
- what the AI engine URL is
- which tenants exist
- which roles are defined

## How to test the tool properly

## Fast demo test

1. Run `Setup SentraCore XDR.cmd`
2. Wait for the browser to open
3. Confirm the dashboard loads
4. In the header, choose a tenant from the `Tenant` dropdown
5. Click one of the simulation buttons:
   `Phishing Drill`, `Credential Takeover`, `Insider Exfiltration`, or `Decoy Tripwire`
6. Watch these areas change:
   `Critical Alerts`, `Highest-Risk User`, `Live Threat Feed`, `User Risk Ranking`, and `Attack Replay Mode`
7. Open the `Alerts` page and see the newly created events
8. Open the `Users` page and see which user risk went up
9. Open `Attack Timeline` to inspect the replay sequence

## What each simulation means

### Phishing Drill

Creates a phishing sequence such as:

- phishing email
- credential submission

Use it to test:

- phishing risk
- suspicious login flow
- alert creation

### Credential Takeover

Creates a sequence such as:

- suspicious login
- privilege escalation
- sensitive file access

Use it to test:

- account takeover style behavior
- identity drift
- user risk ranking changes

### Insider Exfiltration

Creates a sequence such as:

- unusual file access
- command execution
- data exfiltration

Use it to test:

- insider threat style scenarios
- file misuse
- exfiltration alerts

### Decoy Tripwire

Creates a sequence such as:

- decoy access
- recon command activity

Use it to test:

- decoy or honey asset workflows
- malicious reconnaissance logic

## How the product works internally

The product currently uses demo tenants and demo users stored in the local database.

The backend seeds example organizations such as:

- `Sentinel Bank`
- `Nova Biotech`

Each tenant has example users, events, risk snapshots, alerts, and timelines.

When you click a simulation button:

1. the frontend sends a simulation request to the backend
2. the backend creates new events for a user
3. the event pipeline processes those events
4. new risk and alert data is generated
5. the dashboard refreshes and shows the updated state

## What you should do in the dashboard

If you are a product tester or admin, your normal flow is:

1. open `Dashboard`
2. check the overall risk and top user
3. run a simulation
4. inspect the new alert
5. open `Users`
6. open `Attack Timeline`
7. confirm the replay and risk changes make sense

## What “manager and employees” would mean

What you want is a different product flow from the current one.

You want:

1. manager installs a manager version
2. manager creates or owns a company dashboard
3. employees install one setup file on their machines
4. each employee machine automatically registers under that manager
5. employee data starts showing inside that manager dashboard

That is a valid product direction.

But that flow is **not implemented yet** in this build.

## What is missing for that manager-employee model

To support your desired model, the product still needs:

- manager authentication
- company creation and company ownership
- employee enrollment keys or tenant join tokens
- employee installer or endpoint agent
- automatic registration of employee devices
- heartbeat and telemetry from employee machines to backend
- manager-only dashboard filtering by company
- employee-only local client or background service
- secure API auth between employee machines and backend

## What the current setup file actually does

The current setup file does **not** join an employee to a manager.

It only installs and starts the full local demo platform on the same machine.

So right now:

- the setup file is for running the whole demo locally
- it is not yet an employee enrollment installer
- it is not yet a real company deployment installer

## Best way to use it today

Use the current build as:

- a local demo
- a UI proof of concept
- a simulation console
- a product showcase for investors, customers, or internal planning

Do **not** treat it yet as:

- a finished employee rollout system
- a real organization-wide endpoint deployment
- a manager-to-employee production enrollment product

## The next build you actually need

If you want the behavior you described, the next version should be split into 3 parts:

### 1. Manager dashboard

- manager signs in
- manager creates or owns the company
- manager gets a company enrollment key
- manager sees enrolled employees and their devices

### 2. Employee agent / employee installer

- employee runs one setup file
- setup asks for company key or receives pre-bundled token
- device registers to the manager's company
- background service starts sending telemetry

### 3. Cloud backend

- hosted API
- company, device, and user registration
- secure authentication
- centralized alert and risk storage

## Very important truth

The dashboard you are seeing now is useful, but it is mostly a polished security demo console.

It helps you:

- understand the vision
- test scenarios
- show the UI
- prove the feature layout

It does not yet complete the manager-to-employee operational model you want.

## Recommended next step

Build the next feature set in this order:

1. manager login and company model
2. employee enrollment token system
3. employee installer / agent registration
4. backend device check-in and telemetry ingestion
5. manager dashboard company filtering
6. production deployment flow
