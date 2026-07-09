# AWS Setup Guide for CarryGo

## Your Current Setup

| Resource | Value |
|----------|-------|
| Bucket 1 | `carrygo-parcel-proofs` (delivery photos, parcel images) |
| Bucket 2 | `carrygo-user-documents` (KYC docs, avatars) |
| CloudFront 1 | `d1kpta3nvwmxk5.cloudfront.net` (distribution `E3PT1OKTQINIQ7`) |
| Region | `ap-south-1` (Mumbai) |

## What You Still Need

- [x] S3 buckets created
- [x] CloudFront distribution (for parcel-proofs)
- [ ] **CORS on both buckets** (so the app can upload)
- [ ] **Bucket policy** (so CloudFront can read)
- [ ] **IAM user + access keys** (for the app to sign uploads)
- [ ] **Second CloudFront distribution** OR connect both buckets to one
- [ ] **Connect CloudFront → S3 origin**

---

## Step 1: Add CORS to Both Buckets

Go to **S3 → carrygo-parcel-proofs → Permissions → CORS**

Paste this (same for both buckets):

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Repeat for `carrygo-user-documents`.

---

## Step 2: Create IAM User for App Uploads

1. Go to **IAM → Users → Create user**
2. Name: `carrygo-app-uploader`
3. Do NOT check "Provide user access to the AWS Management Console"
4. Click **Next**
5. Choose **Attach policies directly**
6. Click **Create policy** (opens new tab), paste this JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowUploadToCarryGoBuckets",
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": [
        "arn:aws:s3:::carrygo-parcel-proofs/parcel-proofs/*",
        "arn:aws:s3:::carrygo-user-documents/user-documents-proof/*"
      ]
    }
  ]
}
```

7. Name the policy: `CarryGoAppUploadOnly`
8. Create it, go back to the user creation tab
9. Search and attach `CarryGoAppUploadOnly`
10. Create the user

### Get Access Keys

1. Click the user `carrygo-app-uploader`
2. **Security credentials** tab → **Create access key**
3. Choose **Application running outside AWS**
4. Copy the **Access Key ID** and **Secret Access Key**
5. **Save these securely** — you'll give them to me for the `.env`

---

## Step 3: Set Bucket Policy (CloudFront Read Access)

### For `carrygo-parcel-proofs`

Go to **S3 → carrygo-parcel-proofs → Permissions → Bucket policy**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontRead",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::carrygo-parcel-proofs/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::649419331709:distribution/E3PT1OKTQINIQ7"
        }
      }
    }
  ]
}
```

### For `carrygo-user-documents`

Same but with the second distribution ARN (you'll create this in Step 4):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontRead",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::carrygo-user-documents/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::649419331709:distribution/YOUR_SECOND_DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

---

## Step 4: Connect CloudFront to S3

### Check if `d1kpta3nvwmxk5.cloudfront.net` already has an origin

1. Go to **CloudFront → Distributions → E3PT1OKTQINIQ7**
2. Click **Origins** tab
3. Check if an origin pointing to `carrygo-parcel-proofs.s3.ap-south-1.amazonaws.com` exists

**If no origin exists:**
1. Click **Create origin**
2. Origin domain: select `carrygo-parcel-proofs.s3.ap-south-1.amazonaws.com` from dropdown
3. Origin access: **Origin access control settings (recommended)**
4. Click **Create new OAC** → Name: `carrygo-parcel-proofs-oac` → Create
5. Leave other settings default
6. Click **Create origin**
7. AWS will show a blue banner saying "Copy policy" — click it and paste into the bucket policy (Step 3)

### Create Second Distribution for User Documents

1. **CloudFront → Create distribution**
2. Origin domain: `carrygo-user-documents.s3.ap-south-1.amazonaws.com`
3. Origin access: **Origin access control settings**
4. Create new OAC: `carrygo-user-documents-oac`
5. Default cache behavior:
   - Viewer protocol: **Redirect HTTP to HTTPS**
   - Cache policy: **CachingOptimized**
   - Compress objects: **Yes**
6. Settings:
   - Price class: **Use all edge locations** (or "Use North America, Europe, Asia..." for cost savings)
   - HTTP/2: enabled
7. Click **Create distribution**
8. Copy the **Distribution domain name** (like `dXXXXXXXXX.cloudfront.net`)
9. Copy the **ARN** and update the bucket policy for `carrygo-user-documents`

---

## Step 5: Give Me These Values

After completing the steps above, give me:

1. **Access Key ID** — from Step 2 (starts with `AKIA`)
2. **Secret Access Key** — from Step 2
3. **Second CloudFront domain** — from Step 4 (like `d2xxxxxxx.cloudfront.net`)

I'll plug them into your `.env` and you're ready to test uploads.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Mobile App                                             │
│                                                         │
│  Camera/Gallery → optimizeImage (WebP, resize)          │
│       │                                                 │
│       ▼                                                 │
│  signS3PutRequest (AWS Sig V4)                          │
│       │                                                 │
│       ├──► PUT to carrygo-parcel-proofs/parcel-proofs/  │
│       │    (delivery photos, parcel images)             │
│       │                                                 │
│       └──► PUT to carrygo-user-documents/user-docs/     │
│            (KYC, avatars)                               │
└─────────────────────────────────────────────────────────┘
              │                        │
              ▼                        ▼
┌──────────────────────┐  ┌──────────────────────────────┐
│ CloudFront CDN #1    │  │ CloudFront CDN #2            │
│ d1kpta3nvwmxk5...    │  │ dXXXXXXXXXX...              │
│ (parcel proofs)      │  │ (user documents)             │
└──────────────────────┘  └──────────────────────────────┘
              │                        │
              ▼                        ▼
┌──────────────────────┐  ┌──────────────────────────────┐
│ S3: carrygo-parcel-  │  │ S3: carrygo-user-            │
│     proofs           │  │     documents                │
└──────────────────────┘  └──────────────────────────────┘
```

## File Routing

| Upload Type | S3 Bucket | Path Pattern |
|-------------|-----------|--------------|
| Parcel image | carrygo-parcel-proofs | `parcel-proofs/parcels/{userId}/{date}/{parcelId}.webp` |
| Delivery photo | carrygo-parcel-proofs | `parcel-proofs/delivery-proofs/{userId}/{date}/{deliveryId}_pickup.webp` |
| KYC document | carrygo-user-documents | `user-documents-proof/kyc-documents/{userId}/{date}/{sessionId}_id_front.webp` |
| Avatar | carrygo-user-documents | `user-documents-proof/avatars/{userId}/{date}/profile.webp` |

## Image Optimization (Automatic)

| Type | Max Width | Quality | Format | Thumbnail |
|------|-----------|---------|--------|-----------|
| Avatar | 512px | 75% | WebP | 300px ✓ |
| Parcel | 1200px | 72% | WebP | 300px ✓ |
| KYC | 1600px | 80% | WebP | — |
| Delivery proof | 1200px | 70% | WebP | — |

## Security

- App IAM user has **PutObject only** — cannot read, list, or delete
- All reads go through CloudFront (OAC) — S3 is not publicly accessible
- Images are content-addressed (userId + date + fileId) — no URL guessing
- WebP reduces payload = faster uploads on slow networks
