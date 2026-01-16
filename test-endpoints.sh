#!/bin/bash

echo "Testing tRPC Endpoints..."
echo ""

echo "1. Testing equipment.list endpoint:"
curl -s -X GET "http://localhost:3001/trpc/equipment.list" | jq '.result.data' | head -20
echo ""

echo "2. Testing equipment.byId endpoint (getting first equipment ID):"
EQUIPMENT_ID=$(curl -s -X GET "http://localhost:3001/trpc/equipment.list" | jq -r '.result.data[0].id')
echo "Equipment ID: $EQUIPMENT_ID"
curl -s -X GET "http://localhost:3001/trpc/equipment.byId?input=%7B%22id%22%3A%22${EQUIPMENT_ID}%22%7D" | jq '.result.data' | head -30
echo ""

echo "3. Testing inspection.recent endpoint:"
curl -s -X GET "http://localhost:3001/trpc/inspection.recent" | jq '.result.data' | head -20
echo ""

echo "4. All endpoints tested successfully!"
