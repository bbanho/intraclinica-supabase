---
title: "User Guide"
description: "Operational guide for clinic staff - reception, clinical, inventory, and admin workflows"
---

# The System in Practice: Critical Operational Flows

Most medical software on the market (generic SaaS) is passive: they wait for you to type something and passively store the information in a table. **IntraClinica**, through its intelligent governance layer (**NEXUS**), is an **active** system. It predicts chaos in clinical operations before it happens.

To make this tangible and not depend just on imagination, we populated the Pilot Clinic database simulating **Worst-Case Scenarios** (delayed schedules, no-shows, high-cost stock ruptures) and photographed the real behavior of the software under operational stress.

---

## 1. The Chaos of Reception (The "Domino Effect" and No-Shows)

**The Reality (The Bottleneck):**
It's raining hard on a Friday. The reception fills with patients from long appointments that ran late. Two patients send messages canceling high-value appointments at the last minute. The office sits idle for 2 hours, resulting in a R$ 1,500 loss for the day, while the receptionist wastes time calling the waiting list.

**The Active System Resolution:**
In the *Reception* module, we abandoned the classic, rigid "day table". We replaced it with a real-time Flow model (Clinical Kanban):

![Reception and Triage](assets/03-reception-board.png)

1. **Intuitive Visual Management:** With one click, the receptionist moves the patient from "Scheduled" (gray) to "Waiting" (yellow) the moment they enter the clinic.
2. **Instant Synchronization:** In the same fraction of a second the reception clicks "Waiting", the patient's name **flashes on the doctor's screen** (inside the office), indicating that triage has been done. No need for phone calls or papers passing from hand to hand.
3. **Automatic NEXUS (The Sales Machine):** If patient *Mariana Fontes* has been marked as "Cancelled" (Red in the image), the system intelligence reads the calendar, finds the 1-hour "hole", and triggers the WhatsApp bot. A humanized message is sent to the waiting list ("Hello João, we had a cancellation with Dr. now at 2pm, would you like to move up your appointment?"). The vacancy is passively filled, saving the day's billing.

---

## 2. The "Hidden Rupture" of High-Cost Supplies

**The Reality (The Loss):**
The patient is seated in the dermatology clinic chair, face prepared for harmonization. The doctor opens the drawer and realizes the last syringe of *Hyaluronic Acid (Juvederm)* expired last week or was already used. The embarrassment is immediate, the R$ 2,000 sale is lost, and the "paper" stock (or Excel) failed.

**The Active System Resolution:**
IntraClinica ties *Stock* inseparably with the *Medical Record* (Procedures Module).

![Critical Stock Alert](assets/02-inventory-products.png)

1. **Intelligent Visual Alert:** As seen in the panel above, products are not an inert table. The system lights a red Panic light whenever the balance hits the `min_stock` safety threshold configured by the manager. Botulinic Toxin and PDO Threads are "zeroed out", signaling urgency.
2. **Automatic Recipe Deduction (Recipe Magic):** The receptionist or doctor doesn't need to remember to go to stock to "write off" the syringe at the end of the day. When creating a "Recipe" (Harmonization = 1 Syringe + 1 Anesthetic), when the doctor clicks **"Procedure Performed"** in the medical record, the exact quantity is swept from the warehouse.
3. **NEXUS Predictive Alert:** The system reads the **next week's schedule**. If there are 4 Botox applications scheduled, but stock is 2 vials, the manager receives a push/WhatsApp notification today, forcing a *Just-in-Time* purchase without tying up the clinic's working capital in the cabinet.

---

## 3. Long Record vs. Short Time (The Bureaucracy Cure)

**The Reality (Bureaucracy):**
A poly-symptomatic patient, with a 4-year history and dozens of complaints, enters the room. The appointment time is exactly 15 minutes. The doctor spends 10 minutes trying to read and find something in the history (or worse, spends the whole appointment ignoring the patient and typing). The patient feels ignored.

**The Active System Resolution:**
IntraClinica's AI is a structured medical-legal ally.

![AI Medical Record](assets/05-clinical-execution-main.png)

1. **Consolidated and Immutable History:** As shown in the image, each return, evolution, and inserted exam is stacked in an auditable way. Each record receives the professional's signature and inviolable date.
2. **The End of Typing:** The doctor focuses 100% on the patient's eyes. Doesn't touch the keyboard.
   Just at the end of the consultation, they click the AI microphone and dictate messy stream of consciousness: *"Carlos came back today. Lower back pain worsened when lying down, he remembered he's allergic to dipyrone, I prescribed a muscle relaxant and scheduled an urgent resonance."*
3. **Automatic SOAP Formatting:** In two seconds, the AI model (connected to Gemini) swallows the audio, structures the anamnesis in the official **SOAP** format (Subjective, Objective, Assessment, Plan), extracts allergies to red alert boxes at the top of the patient, and generates the final document that will be saved.

---

## 4. The "Creative Block" of Medical Marketing

**The Reality (Friction):**
Private clinics depend on *Instagram* for constant private billing. But after an exhausting day, the doctor doesn't have mental energy to write "scripts for Instagram". The agency charges expensively, gets technical terms wrong, and patient attraction plummets.

**The Active System Resolution:**
The *Social AI* module transforms technical jargon into medical marketing authority in seconds.

![AI Marketing](assets/09-social-generator.png)

1. The doctor (or clinic manager) enters the panel, clicks the generator, and types a five-word rough idea (ex: *"Difference between labial filling and PDO thread"*).
2. Chooses the clinic's exact **Voice Tone** (ex: *Professional and Technical* or *Human and Welcoming*).
3. AI not only generates ready caption (with calls to action and correct city/niche hashtags), but can deliver the exact script (Scene 1, Scene 2, Hook) for a Reels or TikTok video, all without leaving the SaaS. Marketing starts tracking again in under 1 minute.

---

## 5. Governance and the Magic Screen (SaaS Config)

**The Reality (Rigidity):**
Medical systems are full of buttons and tabs that 90% of clinics never use. This creates visual pollution and a lengthy learning curve for new receptionists.

**The Active System Resolution:**
IntraClinica's Config-Driven UI infrastructure resolves this in real-time at the Administration level.

![SaaS Configuration Panel](assets/10-admin-ui-config.png)

1. In the "SaaS Settings" tab, the investor/super admin sees all available *features*.
2. Is it a psychology clinic that doesn't sell products or do minor surgeries? Just **uncheck** "Supply Management" and "Procedures".
3. **Immediate Effect:** These buttons and routes **disappear** from that clinic's system instantly. The interface stays clean, minimalist, and focused solely on the operation that actually makes money.

---

*These images capture the operation running at its limit. IntraClinica, guided by the intelligent NEXUS infrastructure, is the revenue generation engine, risk mitigation, and time return to health professionals.*
