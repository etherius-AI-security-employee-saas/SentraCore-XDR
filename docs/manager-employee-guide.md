# SentraCore XDR Manager And Employee Guide

## Short truth first

The current SentraCore XDR release is a **manager / security console build**.

The current release does **not yet** include:

- a real employee endpoint agent
- one-click employee enrollment into a manager dashboard
- automatic device registration under a company admin

So if you expected:

1. manager installs once
2. employees run one setup file
3. employee devices automatically appear in the manager dashboard

that workflow is **not yet in this version**.

## What the manager should use now

The manager, admin, or SOC operator should use:

- `Setup SentraCore XDR.cmd`

That setup installs and launches:

- the GUI dashboard
- the backend API
- the AI engine

This is the correct current installer for:

- security manager
- SOC analyst
- product demo operator
- internal testing

## What a normal employee should use now

Right now, a normal employee does **not** have a separate real agent installer in this product.

That means:

- employees should **not** be told to install the current package as if it were a production employee agent
- the current package runs the whole console stack, which is a manager/demo environment

## What the current release is best for

Use the current release for:

- local demos
- investor or customer product walkthroughs
- testing attack simulations
- validating the security dashboard experience
- showing how manager-side monitoring could look

## Correct role model for the current version

### Manager / Admin

Runs:

- `Setup SentraCore XDR.cmd`

Then uses:

- dashboard
- alerts
- users
- threat intelligence
- attack timeline
- simulation tools

### Employee

Current version:

- no real employee installer yet
- no auto-connect to manager yet
- no background endpoint agent yet

## What needs to be built for real employee rollout

To support real manager and employee deployment, the product still needs:

- manager sign-in
- company / tenant ownership
- employee enrollment token or company key
- employee background agent
- secure registration to backend
- manager view filtered to their enrolled employees
- policy and seat management
- device heartbeats and telemetry

## Recommended rollout logic for the next version

### Manager installer

- install the admin console
- sign in
- create or claim company
- generate employee enrollment code

### Employee installer

- run one lightweight setup file
- enter company enrollment code
- register device to company
- start background protection service

### Backend

- store company, manager, employee, and device relationships
- receive telemetry
- show those devices in manager dashboard

## Best practical answer today

If you want to use the tool properly today:

- treat it as a manager-side SOC demo console
- do not treat it yet as a finished employee deployment platform

If you want the real manager-to-employee behavior, that should be the next build.
