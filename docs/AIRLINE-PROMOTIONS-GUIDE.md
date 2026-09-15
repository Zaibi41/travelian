# Airline-Based Promotions Setup Guide

## Your Scenario

You want to apply different discounts per airline, regardless of which provider returns them:

- **Provider A** returns **Airblue** flights → Apply **PKR 200 discount**
- **Provider B** returns **Air Arabia** flights → Apply **PKR 100 discount**  
- **Provider C** (any airline) → **No promotion**

## How It Works

The system already supports **airline-based promotions** through the pricing rules engine. When you create a rule with `scope: airline`, it matches the airline name/code across **all providers**.

### Setting Up the Rules

1. **Go to Admin → Flights → Markup Rules tab**

2. **Create Rule for Airblue (PKR 200 off)**:
   - Pricing Scope: **Airline**
   - Airline Target: Select **Airblue (PA)** or type "Airblue"
   - Fixed PKR adjustment: **-200**
   - Save

3. **Create Rule for Air Arabia (PKR 100 off)**:
   - Pricing Scope: **Airline**
   - Airline Target: Select **Air Arabia (G9)** or type "Air Arabia"
   - Fixed PKR adjustment: **-100**
   - Save

## How Airlines Are Matched

The backend matches airlines in this priority:

1. **Exact airline name** (case-insensitive)
   - `"Airblue"` matches offers with `airline: "Airblue"`
   - `"Air Arabia"` matches offers with `airline: "Air Arabia"`

2. **Airline code**
   - `"PA"` matches Airblue
   - `"G9"` matches Air Arabia

3. **Flight number prefix**
   - Flight `PA-123` matches Airblue rule
   - Flight `G9-456` matches Air Arabia rule

## Real Example

### Before Promotion Rules:
```
Provider: SooperFare
Airline: Airblue
Base Fare: PKR 25,000
Final Price: PKR 25,000

Provider: SooperFare  
Airline: Air Arabia
Base Fare: PKR 22,000
Final Price: PKR 22,000

Provider: Skypass
Airline: Emirates
Base Fare: PKR 45,000
Final Price: PKR 45,000
```

### After Airline Promotion Rules:
```
Provider: SooperFare
Airline: Airblue
Base Fare: PKR 25,000
Discount: -PKR 200
Final Price: PKR 24,800 ✅

Provider: SooperFare
Airline: Air Arabia  
Base Fare: PKR 22,000
Discount: -PKR 100
Final Price: PKR 21,900 ✅

Provider: Skypass
Airline: Emirates
Base Fare: PKR 45,000
Discount: None
Final Price: PKR 45,000 (unchanged)
```

## Key Points

✅ **Provider-independent**: Airline rules apply regardless of which provider returns the flight

✅ **Selective targeting**: Only specified airlines get discounts; others unchanged

✅ **Stacks with provider rules**: You can have both provider-level AND airline-level rules

✅ **Works with fare options**: All fare tiers for the matching airline get the discount

## Common Airlines Quick Reference

| Airline | Code | Common Name |
|---------|------|-------------|
| Air Arabia | G9 | Air Arabia |
| Airblue | PA | Airblue |
| PIA | PK | Pakistan International Airlines |
| Fly Jinnah | ER | Fly Jinnah |
| AirSial | 9P | Air Sial |
| Emirates | EK | Emirates |
| Qatar Airways | QR | Qatar Airways |
| Saudia | SV | Saudia |
| Turkish Airlines | TK | Turkish Airlines |
| Gulf Air | GF | Gulf Air |
| flydubai | FZ | flydubai |
| Flynas | XY | Flynas |
| Salam Air | OV | Salam Air |

## Testing Your Rules

1. Create the airline promotion rules
2. Search for flights that include those airlines
3. Check the flight results - discounted price should show
4. Inspect API response or admin logs to verify `pricingRulesApplied` field

## Need to Change a Rule?

Click the **Edit** (pencil icon) button on any saved rule to modify the discount amount or airline target.

## Need to Remove a Rule?

Click the **Delete** (trash icon) button to remove a promotion entirely.
