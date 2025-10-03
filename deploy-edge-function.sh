#!/bin/bash

# ============================================
# Deploy Billplz Payment Edge Function
# ============================================

echo "🚀 Deploying Billplz Payment Edge Function to Supabase"
echo "========================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed${NC}"
    echo ""
    echo "Please install it first:"
    echo ""
    echo "  macOS:"
    echo "    brew install supabase/tap/supabase"
    echo ""
    echo "  Windows/Linux:"
    echo "    npm install -g supabase"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI found${NC}"
echo ""

# Check if logged in
echo "🔐 Checking Supabase authentication..."
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Supabase${NC}"
    echo ""
    echo "Logging in..."
    supabase login
fi

echo -e "${GREEN}✅ Authenticated${NC}"
echo ""

# Link project
echo "🔗 Linking to project..."
PROJECT_REF="mvmwcgnlebbesarvsvxk"

# Check if already linked
if [ -f "./.supabase/config.toml" ]; then
    echo -e "${GREEN}✅ Project already linked${NC}"
else
    echo "Linking to project: $PROJECT_REF"
    supabase link --project-ref $PROJECT_REF
fi

echo ""

# Set environment secrets
echo "🔑 Setting environment secrets..."
echo ""
echo "Please enter your Billplz credentials:"
echo ""

read -p "Billplz API Key (from your PHP .env): " BILLPLZ_API_KEY
read -p "Billplz Collection ID (from your PHP .env): " BILLPLZ_COLLECTION_ID
read -p "Your App URL (e.g., https://your-app.vercel.app): " APP_URL

echo ""
echo "Setting secrets..."

supabase secrets set BILLPLZ_API_KEY="$BILLPLZ_API_KEY"
supabase secrets set BILLPLZ_COLLECTION_ID="$BILLPLZ_COLLECTION_ID"
supabase secrets set APP_URL="$APP_URL"

echo -e "${GREEN}✅ Secrets configured${NC}"
echo ""

# Deploy function
echo "📦 Deploying Edge Function..."
echo ""

supabase functions deploy create-billplz-payment

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ ✅ ✅ DEPLOYMENT SUCCESSFUL! ✅ ✅ ✅${NC}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Your Edge Function is now deployed and ready!"
    echo ""
    echo "Next steps:"
    echo "  1. Refresh your app"
    echo "  2. Go to /billing page"
    echo "  3. Click 'Subscribe Now'"
    echo "  4. You'll be redirected to Billplz payment page"
    echo ""
    echo "To view logs:"
    echo "  supabase functions logs create-billplz-payment"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Deployment failed${NC}"
    echo ""
    echo "Please check the error message above and try again."
    exit 1
fi
