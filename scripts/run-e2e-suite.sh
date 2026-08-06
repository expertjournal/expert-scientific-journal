#!/usr/bin/env bash
# ==============================================================================
# Expert Scientific Journal Platform - Real Runtime Integration & E2E Test Suite
# ==============================================================================

BASE_URL="http://localhost:4000/api"
COLOR_RESET="\033[0m"
COLOR_GREEN="\033[32m"
COLOR_RED="\033[31m"
COLOR_YELLOW="\033[33m"

echo -e "${COLOR_YELLOW}====================================================${COLOR_RESET}"
echo -e "${COLOR_YELLOW}  Starting E2E Real HTTP API Integration Suite      ${COLOR_RESET}"
echo -e "${COLOR_YELLOW}====================================================${COLOR_RESET}"

# 1. Health Check
echo -n "Testing GET /api/health ... "
HEALTH_RES=$(curl -s -w "\n%{http_code}" "${BASE_URL}/health")
HTTP_CODE=$(echo "$HEALTH_RES" | tail -n 1)
BODY=$(echo "$HEALTH_RES" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${COLOR_GREEN}[PASSED 200 OK]${COLOR_RESET} Response: $BODY"
else
  echo -e "${COLOR_RED}[FAILED $HTTP_CODE]${COLOR_RESET} Response: $BODY"
fi

# 2. Register Author
RANDOM_ID=$((RANDOM % 9000 + 1000))
AUTHOR_EMAIL="author_${RANDOM_ID}@journal-expert.ru"
echo -n "Testing POST /api/auth/register ($AUTHOR_EMAIL) ... "
REG_RES=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${AUTHOR_EMAIL}\",\"password\":\"SecurePass123!\",\"fullName\":\"Иван Иванов\",\"institution\":\"ТашГЭУ\"}")
HTTP_CODE=$(echo "$REG_RES" | tail -n 1)
BODY=$(echo "$REG_RES" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${COLOR_GREEN}[PASSED ${HTTP_CODE}]${COLOR_RESET} Response: $BODY"
else
  echo -e "${COLOR_RED}[FAILED $HTTP_CODE]${COLOR_RESET} Response: $BODY"
fi

# 3. Verify Email
echo -n "Testing POST /api/auth/verify-email ... "
VERIFY_RES=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/auth/verify-email" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${AUTHOR_EMAIL}\",\"code\":\"123456\"}")
HTTP_CODE=$(echo "$VERIFY_RES" | tail -n 1)
BODY=$(echo "$VERIFY_RES" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${COLOR_GREEN}[PASSED 200 OK]${COLOR_RESET} Response: $BODY"
  TOKEN=$(echo "$BODY" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
else
  echo -e "${COLOR_RED}[FAILED $HTTP_CODE]${COLOR_RESET} Response: $BODY"
fi

# 4. Login
echo -n "Testing POST /api/auth/login ... "
LOGIN_RES=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${AUTHOR_EMAIL}\",\"password\":\"SecurePass123!\"}")
HTTP_CODE=$(echo "$LOGIN_RES" | tail -n 1)
BODY=$(echo "$LOGIN_RES" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${COLOR_GREEN}[PASSED 200 OK]${COLOR_RESET} Response: $BODY"
else
  echo -e "${COLOR_RED}[FAILED $HTTP_CODE]${COLOR_RESET} Response: $BODY"
fi

# 5. Search Articles
echo -n "Testing GET /api/search?q=Economics ... "
SEARCH_RES=$(curl -s -w "\n%{http_code}" "${BASE_URL}/search?q=Economics&page=1&limit=5")
HTTP_CODE=$(echo "$SEARCH_RES" | tail -n 1)
BODY=$(echo "$SEARCH_RES" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${COLOR_GREEN}[PASSED 200 OK]${COLOR_RESET} Response: $BODY"
else
  echo -e "${COLOR_RED}[FAILED $HTTP_CODE]${COLOR_RESET} Response: $BODY"
fi

echo -e "${COLOR_YELLOW}====================================================${COLOR_RESET}"
echo -e "${COLOR_YELLOW}  E2E Test Execution Completed                      ${COLOR_RESET}"
echo -e "${COLOR_YELLOW}====================================================${COLOR_RESET}"
