1. Basic rule — request kaun bhejega?
Sender → Request create karega
Sender ko parcel bhejna hai, to:

Sender
→ Create Parcel Request
→ Destination + pickup + date/time + parcel details
→ Available travellers dekhega / matching travellers milenge
→ Traveller ko request bhejega

Traveller → Accept/Reject karega
Traveller ne pehle apni trip publish ki hogi:

Traveller
→ Post Trip
→ Hisar → Delhi
→ Date/time
→ Transport mode
→ Available capacity
→ Parcel categories

Phir matching sender requests traveller ko dikhenge.

Traveller decides:

Accept

Reject

Ignore/expire

Tumhare existing product documentation mein bhi traveller ke features mein “Review compatible parcel requests” aur “Accept or reject requests” defined hain. 
Pasted text


2. Complete CarryGo Flow
Isko app ka main state machine samjho:


TRAVELLER
   │
   ├── Create Trip
   │      │
   │      └── Route + Date + Time + Capacity
   │
   ▼
CARRYGO MATCHING ENGINE
   ▲
   │
   │
SENDER
   │
   ├── Create Parcel Request
   │      │
   │      └── Pickup + Destination + Parcel Details
   │
   ▼
MATCH FOUND
   │
   ▼
SENDER SENDS REQUEST
   │
   ▼
TRAVELLER ACCEPTS
   │
   ▼
BOOKING CONFIRMED
   │
   ▼
CHAT / COORDINATION OPENS
   │
   ▼
PICKUP
   │
   ├── OTP / QR
   ├── Parcel photos
   ├── Seal verification
   └── Handover confirmation
   │
   ▼
IN TRANSIT
   │
   ▼
DELIVERY
   │
   ├── Receiver OTP / QR
   ├── Parcel condition confirmation
   └── Delivery confirmation
   │
   ▼
PAYMENT RELEASE
   │
   ├── Traveller gets payout
   └── CarryGo gets commission
   │
   ▼
RATING + REVIEW
   │
   ▼
CONNECTION CLOSED
Tumhare project documents mein pickup ke time OTP/QR, timestamp, location, parcel-condition photo aur seal number, aur delivery par receiver OTP/QR, seal verification aur handover evidence ka structure already defined hai. 
Pasted text


3. Connection कब बनेगा?
Ye bahut important hai.

Request send karte hi connection nahi banana hai.

Before acceptance
Sender:

"I want this traveller to carry my parcel."

Traveller ko request milegi.

Status:

REQUESTED

Dono ek dusre ke full personal contact details nahi dekhenge.

Traveller accepts
Traveller:

"Yes, I will carry this parcel."

Ab:

REQUESTED → ACCEPTED

Aur isi moment par Booking/Connection create hoga.

4. Connection mein kya open hoga?
Acceptance ke baad ek Delivery Chat / Booking Room create karo.

Example:

CarryGo Booking #CG10245
Sender
Jatin

Traveller
Rahul

Route
Hisar → Delhi

Parcel
Documents

Pickup
Hisar Bus Stand

Delivery
Delhi Kashmere Gate

Pickup Window
8:00–8:30 AM

Delivery ETA
12:00–1:00 PM

Chat mein:
Sender:

"Pickup 8:15 AM par possible hai?"

Traveller:

"Yes."

Sender:

"Okay."

Important: Chat booking ke saath tied honi chahiye. Random permanent chat system mat banana.

5. Connection कब तक रहेगा?
Permanent connection nahi hona chahiye.

Connection ko transaction lifecycle ke saath tie karo.

Connection Active:
Traveller accepts request

↓

Pickup pending

↓

Parcel picked up

↓

In transit

↓

Delivery pending

↓

Delivery completed

Delivery complete hote hi:
Connection → COMPLETED

Uske baad:

Transaction history rahegi

Chat read-only ho sakti hai

Ratings/reviews available rahenge

Evidence accessible rahega

Lekin active delivery chat close ho jayegi.

6. Cancellation kaise hoga?
Ye bhi app mein mandatory hai.

Before Traveller Accepts
Sender:

Cancel Request

No major penalty.

Status:

REQUESTED → CANCELLED

Traveller Rejects
REQUESTED → REJECTED

Sender ko dusra traveller search karne do.

Traveller accepts but pickup se pehle
Dono cancellation request kar sakte hain.

But reason mandatory:

Personal emergency

Trip cancelled

Sender unavailable

Traveller unavailable

Parcel issue

Other

Aur cancellation history maintain karo.

7. Pickup ke baad cancellation?
Normal cancellation allow mat karo.

Once traveller has physically received the parcel:


PICKED_UP
     ↓
IN_TRANSIT
     ↓
DELIVERED
Agar problem aati hai:

Raise Issue / Support

Examples:

Receiver unavailable

Traveller route changed

Parcel damaged

Parcel mismatch

Safety issue

Emergency

Is point par admin/support intervention hona chahiye.

Tumhare existing design mein receiver no-show ke liye alternate receiver, maximum waiting time aur fallback arrangement bhi planned hai. 
Pasted text


8. Payment कब होगा?
Main tumhare MVP mein simple flow rakhunga:

Sender
Create Request

↓

Price calculated/agreed

↓

Payment

↓

Payment status:

PAID / PAYMENT_PROTECTED

↓

Traveller accepts

↓

Pickup

↓

Delivery OTP

↓

DELIVERY COMPLETED

↓

Traveller payout eligible

↓

Traveller gets payout

CarryGo commission deduct karega.

Tumhare existing business model mein bhi flow:

Sender pays → payment protected → delivery verified → traveller earns → CarryGo commission defined hai. 
CarryGo_Illustrated_Canva_Edita…


Note: App/UI mein “escrow” word tabhi use karna jab actual payment provider/legal structure usko support karta ho; existing CarryGo documentation bhi is distinction ko note karti hai. 
CarryGo_Light_Theme_Pitch_Deck


9. Sender App mein kya dikhega?
Home

Good Morning, Jatin

[ Send a Parcel ]

Active Deliveries
┌─────────────────────┐
Hisar → Delhi
Traveller: Rahul
Status: In Transit
ETA: 1:20 PM
└─────────────────────┘
Send Parcel

Where from?
Hisar

Where to?
Delhi

When?
25 Aug

Parcel Category
Documents

Weight
1.2 kg

Declared Value
₹2,000

Receiver
Name + Phone

[ Continue ]
Then:

Matching

Compatible Travellers

Rahul
Hisar → Delhi
8:00 AM
Capacity: 5 kg
Rating: 4.8

₹180 reward

[ View Details ]
[ Send Request ]
10. Traveller App mein kya dikhega?
Home

Your Upcoming Trip

Hisar → Delhi
25 Aug
Departure: 8:00 AM

Available Capacity
5 kg

[ View Parcel Requests ]
Then:

Parcel Requests

New Request

Sender: Jatin
Route: Hisar → Delhi
Parcel: Documents
Weight: 1.2 kg
Value: ₹2,000

Traveller Reward: ₹180

[ Reject ]     [ Accept ]
Traveller Accept करेगा तो booking create होगी.

11. सबसे important — Traveller पहले Trip बनाएगा
ये CarryGo का core difference है.

Traditional delivery app में:

Sender → delivery boy

CarryGo में:

Traveller → Trip → Available Capacity

और दूसरी तरफ:

Sender → Parcel Requirement

फिर:

CarryGo → Match

यानी platform दोनों sides को independently create करने देता है.

तुम्हारे proposal में traveller journey publishing में origin, destination, departure/arrival window, transport mode, available capacity और acceptable parcel categories शामिल हैं. 
Pasted text


12. Backend में statuses ऐसे रखो
ये development के लिए बहुत important है.

Trip Status

DRAFT
PUBLISHED
MATCHING
BOOKED
IN_PROGRESS
COMPLETED
CANCELLED
EXPIRED
Parcel Request Status

DRAFT
SUBMITTED
MATCHING
REQUESTED
ACCEPTED
REJECTED
CANCELLED
EXPIRED
Booking Status

PENDING_ACCEPTANCE
CONFIRMED
PICKUP_SCHEDULED
PICKED_UP
IN_TRANSIT
DELIVERY_PENDING
DELIVERED
DISPUTED
CANCELLED
FAILED
Payment Status

PENDING
AUTHORIZED/PROTECTED
RELEASE_PENDING
RELEASED
REFUNDED
PARTIALLY_REFUNDED
DISPUTED
13. मैं एक और important चीज़ add करूंगा
Sender को directly traveller की सारी personal information मत दिखाना.

Before acceptance:

Rahul
⭐ 4.8
Verified ✓
23 completed trips
Hisar → Delhi
5 kg capacity

लेकिन:

❌ Personal phone
❌ Personal email
❌ Exact home address

Acceptance के बाद भी communication in-app chat/call masking के through better रहेगा.

तुमhare existing trust model में identity verification, in-app communication, parcel evidence, OTP handover, payment protection और ratings core trust layer हैं. 
CarryGo_Professional_Canva_Edit…


Final architecture
बस ये एक diagram याद रखो:


              TRAVELLER
                  │
             POST TRIP
                  │
                  ▼
           ┌─────────────┐
           │   CARRYGO   │
           │   MATCHING  │
           └─────────────┘
                  ▲
                  │
          CREATE PARCEL
                  │
               SENDER
                  │
                  ▼
           REQUEST SENT
                  │
                  ▼
             TRAVELLER
            ACCEPT / REJECT
                  │
               ACCEPT
                  ▼
          BOOKING CONFIRMED
                  │
                  ▼
             CHAT OPENS
                  │
                  ▼
          PICKUP + OTP/QR
                  │
                  ▼
              IN TRANSIT
                  │
                  ▼
          DELIVERY + OTP/QR
                  │
                  ▼
          PAYMENT RELEASE
                  │
                  ▼
            RATING / REVIEW
                  │
                  ▼
          CONNECTION CLOSED
मेरी recommendation: app में “Connection” को अलग permanent feature मत बनाओ. “Booking” ही connection का container हो. इससे database, permissions, chat, payment, dispute और lifecycle सब साफ रहेंगे।

और तुम्हारे current documented flow के साथ यह exactly align करता है: trip posting → parcel request → matching → acceptance → verified pickup → OTP delivery → payout/rating. 
