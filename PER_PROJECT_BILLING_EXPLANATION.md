# Per-Project Billing System Explanation

## Current Status: UI Only Changed ⚠️

**What I changed:**
- ✅ UI text says "Pay Per Project", "One-time payment", "Lifetime access"
- ✅ Removed "Monthly subscription" wording
- ✅ Removed Tahun dropdown

**What ACTUALLY happens:**
- ❌ Backend still uses monthly subscription model
- ❌ Payment is still processed as monthly subscription (RM 1.00/month)
- ❌ Projects don't have individual "paid" status
- ❌ Users get access to ALL projects after one payment

---

## How Current System Works (Monthly Subscription)

### Flow:
```
1. User signs up → Gets 7-day trial
2. User clicks "Subscribe Now" → Redirected to Billplz
3. User pays RM 1.00
4. Billplz webhook activates subscription
5. User has access to create unlimited projects for 1 month
6. After 1 month → Subscription expires
```

### Database Structure:
```sql
user_subscriptions:
  - user_id
  - status: 'trial' | 'active' | 'expired'
  - current_period_end (1 month from payment)

payments:
  - user_id
  - subscription_id
  - amount
  - status: 'paid'
```

---

## How TRUE Per-Project Billing Should Work

### New Flow:
```
1. User signs up → Can create unlimited FREE projects
2. User creates Project A → Project status: "unpaid"
3. User clicks "Publish Project" on Project A → Pay RM X
4. User pays → Project A status: "paid" (lifetime)
5. User creates Project B → Project status: "unpaid"
6. User clicks "Publish Project" on Project B → Pay RM X again
7. Each project paid individually, no expiry
```

### Key Differences:

| Current (Monthly)          | True Per-Project              |
|---------------------------|-------------------------------|
| Pay once, access all      | Pay per project               |
| Access expires monthly    | Lifetime access per project   |
| User subscription-based   | Project payment-based         |
| Global access control     | Per-project access control    |

---

## Implementation Plan for True Per-Project Billing

### 1. Database Changes

```sql
-- Add payment status to projects
ALTER TABLE projects 
ADD COLUMN is_paid BOOLEAN DEFAULT false,
ADD COLUMN paid_at TIMESTAMP,
ADD COLUMN payment_id UUID REFERENCES payments(id),
ADD COLUMN price NUMERIC(10,2) DEFAULT 5.00;

-- Link payments to specific projects
ALTER TABLE payments
ADD COLUMN project_id UUID REFERENCES projects(id);

-- Remove subscription requirement (users can create projects without subscription)
-- Keep user_subscriptions table for trial tracking only
```

### 2. Add "Publish" Button to Projects

**Location:** Dashboard project cards or WebsiteBuilder

```tsx
// In Dashboard.tsx or WebsiteBuilder.tsx
{!project.is_paid && (
  <Button onClick={() => handlePublishProject(project.id)}>
    <CreditCard className="h-4 w-4 mr-2" />
    Publish Project - RM 5.00
  </Button>
)}

{project.is_paid && (
  <Badge className="bg-green-500">
    <Check className="h-4 w-4 mr-1" />
    Published
  </Badge>
)}
```

### 3. Update Payment Flow

**Current:**
```typescript
// Creates subscription payment
createBillplzPayment(userId, planId);
```

**New:**
```typescript
// Creates project payment
createProjectPayment(userId, projectId, amount);
```

**Edge Function Changes:**
```typescript
// supabase/functions/create-billplz-payment/index.ts
interface BillplzRequest {
  user_id: string;
  project_id: string;  // NEW: Link to specific project
  amount: number;
  description: string;
}

// In webhook handler:
async function handlePaymentSuccess(billId, projectId) {
  // Mark project as paid
  await supabase
    .from('projects')
    .update({ 
      is_paid: true, 
      paid_at: new Date().toISOString() 
    })
    .eq('id', projectId);
}
```

### 4. Access Control Changes

**Current:**
```typescript
// Check if user has active subscription
if (subscription?.status === 'active') {
  // Allow access to all features
}
```

**New:**
```typescript
// Check if specific project is paid
const { data: project } = await supabase
  .from('projects')
  .select('is_paid')
  .eq('id', projectId)
  .single();

if (project.is_paid) {
  // Allow publishing/preview of THIS project
}
```

### 5. Preview/Publishing Logic

**Unpaid Projects:**
- Can be created and edited
- Can preview in editor
- **Cannot** publish to public URL
- **Cannot** share link

**Paid Projects:**
- ✅ Can be created and edited
- ✅ Can preview in editor
- ✅ **Can publish to public URL**
- ✅ **Can share link**
- ✅ Lifetime access

---

## Migration Steps (If You Want True Per-Project)

### Step 1: Update Database Schema
Run SQL migrations to add `is_paid` to projects table

### Step 2: Update Billing.tsx
- Remove subscription plans display
- Show "Pay to publish individual projects" message

### Step 3: Update Dashboard.tsx
- Add "Publish" button to each project card
- Show payment status badge

### Step 4: Update WebsiteBuilder.tsx
- Add "Publish Project" button in header
- Disable public preview for unpaid projects

### Step 5: Update Edge Function
- Accept `project_id` instead of `plan_id`
- Update webhook to mark project as paid

### Step 6: Update Payment Flow
```typescript
// New function in billing.ts
export async function createProjectPayment(
  userId: string,
  projectId: string,
  amount: number = 5.00
): Promise<{ payment_url: string }> {
  // Similar to createBillplzPayment but for project
}
```

### Step 7: Add Access Control
- Check `project.is_paid` before allowing public access
- Show paywall for unpaid projects

---

## Pricing Options

### Option 1: Fixed Price Per Project
- RM 5.00 per project (one-time)
- Simple, clear pricing

### Option 2: Tiered Pricing
- Basic Project: RM 3.00
- Pro Project: RM 5.00 (with custom domain)
- Premium Project: RM 10.00 (with analytics)

### Option 3: Bundle Pricing
- 1 Project: RM 5.00
- 5 Projects: RM 20.00 (RM 4 each)
- 10 Projects: RM 35.00 (RM 3.50 each)

---

## What Needs to Happen Now

**Option A: Keep Current System (Monthly Subscription)**
- Change UI back to say "Monthly Subscription"
- Be honest about recurring payments
- Keep current implementation

**Option B: Implement True Per-Project**
- Follow implementation plan above
- Update database schema
- Update all payment flows
- Add per-project access control
- Estimated time: 4-6 hours of development

**Option C: Hybrid Model**
- Users can choose:
  - Monthly subscription: RM 10/month (unlimited projects)
  - OR Pay per project: RM 5/project (one-time)

---

## My Recommendation

I recommend **Option B: True Per-Project Billing** because:
1. ✅ Simpler for users (no recurring fees)
2. ✅ More predictable costs
3. ✅ Better for students/occasional users
4. ✅ Matches what UI currently says
5. ✅ Easier to understand: "Pay to publish, keep forever"

But this requires the full implementation plan above!

---

## Quick Summary

**Current State:**
- UI says "per project" but backend does "monthly subscription"
- Misleading to users!

**Next Steps:**
1. **Decide:** True per-project OR keep monthly subscription?
2. **If per-project:** Follow implementation plan
3. **If monthly:** Change UI text back to match backend

Let me know which direction you want to go! 🚀
