# SecLabs: CityFlow AI Security Training Platform

SecLabs is a hands-on cybersecurity training platform built around a fictional scenario: **CityFlow AI**, a smart city traffic management system that has been compromised. You investigate the attack, reproduce it in an isolated lab environment, and implement defenses, all inside your browser.

---

## What you will learn

- How **data poisoning attacks** corrupt AI/ML pipelines
- How attackers exploit **RAG assistants** through prompt injection
- How to identify anomalies in live pipeline logs
- How to implement real defensive layers (input validation, anomaly detection, drift monitoring)
- How AI supply chain attacks work and how to audit model artifacts

---

## Platform overview

The platform is structured as a journey through three paired stages:

| Stage        | What you do                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------- |
| **Scenario** | Investigate the attack: read pipeline logs, trace anomalies, answer guided questions            |
| **Lab**      | Reproduce and mitigate by running scripts inside a live isolated container, all in your browser |

### Available content

|            | Title                           | Description                                                          |
| ---------- | ------------------------------- | -------------------------------------------------------------------- |
| Scenario 1 | Trace the Data Poisoning Attack | Analyze backend logs to find the root cause of the CityFlow gridlock |
| Lab 1      | Poisoning & Defense             | Execute the attack yourself, then implement three defensive layers   |

---

## Getting started

### Prerequisites

- A modern web browser (Chrome or Firefox recommended)
- Access to the platform URL provided by your instructor

### Logging in

Navigate to the platform URL and log in with the credentials given to you. Students receive a standard account; instructors may have admin access.

### Navigation

The left sidebar shows your learning journey. Items unlock progressively as you complete each stage. You can always return to a completed stage to review it.

---

## How a scenario works

1. **Read the briefing:** background on the CityFlow incident and what went wrong
2. **Explore the pipeline:** watch the live AI pipeline run in clean and vulnerable modes, observing how data flows through each node
3. **Read the logs:** identify the anomalous entries that reveal the attack
4. **Answer the assessment:** a guided question that checks your understanding before you move on

---

## How a lab works

1. **Start the lab:** the platform boots an isolated container in the background (takes ~30 seconds)
2. **Follow the guide:** step-by-step instructions walk you through the attack and the defense scripts
3. **Use the desktop:** an interactive Linux desktop runs inside your browser. The lab scripts are on the Desktop
4. **Check the metrics:** the Metrics tab shows live readings: model accuracy, accepted/rejected inputs, defense coverage
5. **Take the quiz:** complete the knowledge check to finish the lab and receive personalized tutor feedback

### Lab tabs

| Tab     | Purpose                                                                   |
| ------- | ------------------------------------------------------------------------- |
| Guide   | Step-by-step instructions for the current lab                             |
| Logs    | Live output from the lab container                                        |
| Metrics | Real-time security metrics (accuracy, poisoning status, defense coverage) |
| Quiz    | Knowledge check (unlocks after completing all guide steps)                |

---

## The AI Tutor

An AI tutor (powered by Gemini) is available throughout the platform via the chat widget. After completing the quiz, it automatically provides personalized feedback on your answers and recommends further reading from the security reference library.

You can also ask it questions at any time about the concepts covered in the current lab or scenario.

---

## Security Reference

The **Docs** section (accessible from the sidebar) contains reference articles on the attack types covered in the platform:

- Data Poisoning
- Input Injection / Prompt Injection
- Input & Output Guardrails
- Supply Chain Attacks
- Improper Output Handling
- Anomaly Detection in ML
- AI Pipeline Security Overview

---

## For instructors

The **Admin panel** (visible to admin accounts) lets you manage student accounts: view registered users and remove accounts as needed.

Student progress is session-based. Each student's journey state is stored locally in their browser; there is no server-side progress tracking in the current version.

---

## Troubleshooting

**The lab desktop is blank or shows a connection error.**
The container may still be booting. Wait 30 seconds and click "Retry Connection". If it persists, ask your instructor to restart the lab service.

**The AI Tutor is not responding.**
The tutor service may be temporarily unavailable. Refresh the page and try again.

**The pipeline shows all nodes as offline.**
The backend pipeline services may not be running. Contact your instructor.

---
