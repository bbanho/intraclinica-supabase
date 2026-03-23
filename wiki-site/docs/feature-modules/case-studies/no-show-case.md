---
title: "Case Study 01: The No-Show Domino Effect"
description: "How NEXUS AI automatically fills appointment gaps to prevent revenue loss"
onlyUsersWithPermission: ai.use
---

# Case Study 01: The "Domino Effect" of No-Shows

The biggest financial drain of a private clinic isn't fixed costs—it's **idle clinical hours**. When a patient doesn't show up, the doctor stands still, energy is spent, and revenue doesn't come in.

---

## 🌪️ The Origin of Chaos (The Schedule)

It all starts with the macro view of the clinic. It's raining hard on a Friday afternoon. Two patients send messages canceling high-value appointments (e.g., facial harmonization) only 30 minutes before the scheduled time. The clinic just lost R$ 2,000 that day.

![The Schedule and the Gap](/assets/07-appointments-list.png)
*(The schedule in list format, signaling the exact empty slot between 2pm and 3pm).*

The receptionist panics and starts calling the 15 people on the waiting list. No one answers, or patients say they're "far away and can't get there in time."

## ⚙️ Step 1: Action at the Front-line (Reception)

The receptionist doesn't need to open spreadsheets or notebooks. In the Reception module (Clinical Kanban), she simply drags or clicks on the patient card and changes the status to **"Cancelled"** (Red).

![The Reception Kanban Under Stress](/assets/03-reception-board.png)
*(Notice the patient highlighted in red as 'Cancelled' and the continuous flow of 'Waiting' and 'In Service' patients).*

## 🧠 Step 2: The NEXUS Magic (How AI Acts)

In the millisecond the card turns red, the IntraClinica system stops being passive software and becomes an active business partner:

1. **Gap Identification:** NEXUS reads the Appointments table and realizes a premium slot (1 hour) has opened from 2pm to 3pm.
2. **Smart Scan:** AI scans the clinic's **Waiting List** database, filtering only patients who live in the region (ZIP code cross-reference) and who requested that same type of procedure.
3. **Active Dispatch (WhatsApp):** Without any human intervention, NEXUS uses the WhatsApp API to send personalized messages in natural language to the 3 most likely patients:
   > *"Hello, João! How are you? We had a last-minute schedule opening with the Doctor at 2pm today. Since you were on our waiting list for this procedure, would you like to take this spot?"*
4. **Confirmation:** The first patient who responds "Yes", the WhatsApp bot interprets the affirmative intent via AI and **automatically inserts the patient into the reception Kanban**, already with the "Scheduled" status.

## 📈 The Operational Result

The vacancy was filled in 4 minutes. The receptionist didn't need to make a single call. The doctor was notified in the office about the patient change. **The R$ 2,000 was silently recovered by the system.**

---

**Related Case Studies:**
- [Case 02: Inventory Rupture](./inventory-rupture-case) — How stock management connects to scheduling
- [Case 05: SaaS Governance](./saas-governance-case) — Multi-tenant UI configuration
