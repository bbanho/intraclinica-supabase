---
title: "Case Study 02: The Hidden Supply Rupture (High Value)"
description: "Predictive inventory management preventing procedure cancellations"
onlyUsersWithPermission: ai.use
---

# Case Study 02: The Hidden Rupture of Supplies (High Value)

Aesthetic procedures (Botox, Acids, PDO Threads) or dentistry (Implants) have very high added value supplies (R$ 800 - R$ 2,000 per ampoule) and strict expiration dates. Running out of product at H-hour is unacceptable.

---

## 🌪️ The Scenario (The Loss)

The patient is seated in the dermatology clinic chair. The doctor opens the drawer and realizes the last syringe of *Hyaluronic Acid (Juvederm)* expired last week or was already used. The embarrassment is immediate, the sale is lost, the patient is furious, and the "paper" stock (or Excel) failed to alert the manager.

## ⚙️ Step 1: Configuration of the 'Recipe' (Procedures)

In IntraClinica, *Stock* is never an "isolated table". It communicates in real-time with *Procedures*.
The clinic registers Procedures as "Kits" (Recipes).

![Procedures and Recipes Module](/assets/06-procedures-recipes.png)
*(Note that the Harmonization Procedure has Hyaluronic Acid and Anesthetic attached to it).*

## ⚙️ Step 2: Automatic Deduction in the Medical Record

During the consultation, the doctor doesn't leave their flow. When finalizing the appointment in the **Electronic Medical Record**, they just mark that "Harmonization" was **Completed**.

![Medical Record](/assets/05-clinical-execution-main.png)
*(View of Clinical Execution where the procedure is finalized and billing is generated).*

At this moment, the system enters the warehouse in milliseconds and **deducts the exact items** using the FIFO method (First In, First Out).

## 🧠 Step 3: The Predictive NEXUS Magic

IntraClinica doesn't wait for the product to run out to flash the alert on the manager's screen. It acts today looking at next week.

![Critical Stock Alert](/assets/02-inventory-products.png)
*(Stock Panel: Red tags signal rupture. Botulinic Toxin and PDO Threads are "zeroed out", signaling purchase urgency).*

1. **Demand Forecast:** NEXUS AI reads the entire schedule of clinic doctors for the **next 15 days**.
2. **Future Consumption Calculation:** If AI finds **10 Tox applications scheduled**, but current stock is **8 vials**, the system lights the Critical Alert (red on screen above).
3. **Active Notification:** The Administrator panel sends the warning: *"Rupture risk: 2 vials will be missing for next week's schedule."*

## 📈 The Operational Result

The clinic adopts the **Just-in-Time** concept. The manager doesn't need to keep R$ 50,000 of working capital "trapped" in the cabinet, and no patient will ever be sent away due to lack of material.

---

**Related Case Studies:**
- [Case 01: No-Show Prevention](./no-show-case) — Scheduling intelligence
- [Case 03: AI Medical Records](./clinical-ai-case) — Procedure execution flow
