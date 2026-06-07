<!-- todo: have the user define a format(using a structured template of course. They just define their key names all structure. Then we run it through our parser to spit out that end result) -->

# Sheet Reader API Documentation

## Overview

The `readSheet` API is a flexible utility for reading data from Google Sheets. It provides a simple, promise-based interface to fetch any range of data from any Google Sheet using the Google Sheets API v4.

**⚠️ Critical Requirement:** A valid Google API key is **ESSENTIAL** for this API to function. Without it, all requests will fail with authentication errors. The API key is your gateway to accessing any sheets.

**Location:** `src/lib/scoreController.ts`

---

## ⚠️ Prerequisites - Required Before Using This API

**You MUST complete Google's official setup first:**

👉 **[Google Sheets API - JavaScript Quickstart](https://developers.google.com/workspace/sheets/api/quickstart/js)**

This covers:

- Creating a Google Cloud project
- Enabling the Google Sheets API
- Creating API credentials
- Obtaining your API key

**Do not proceed with this API until you have completed the above guide and have an API key.**

---

## 🔐 IMPORTANT: API Key Security Configuration

⚠️ **READ THIS BEFORE CONTINUING** ⚠️

Your API key will be **exposed in browser source code** because it's used in frontend JavaScript. You MUST configure restrictions, or your key can be abused.

**Two mandatory restrictions you MUST set up:**

1. **API Restrictions:** Only allow **Google Sheets API** (not all Google APIs)
2. **HTTP Referrer Restrictions:** Only allow requests from **your application URL(s)**

See detailed instructions in the [⚠️ CRITICAL Security Configuration section](#-critical-security-configuration) below. Implement these BEFORE deploying to production.

---

## Function Signature

```typescript
readSheet(
  spreadsheetId: string,      // Which sheet to read from
  sheetRange: string,          // What data to read
  apiKey?: string              // HOW to access it (CRITICAL)
): Promise<SheetData>
```

**⚠️ All three parameters are essential:**

- `spreadsheetId` - specifies WHICH sheet
- `sheetRange` - specifies WHAT to read
- `apiKey` - specifies HOW you authenticate (most important)

---

## Parameters

### `spreadsheetId` (Required)

**Type:** `string`  
**Description:** The unique identifier for the Google Sheet you want to read.

**How to find it:**

- Open your Google Sheet in a browser
- Copy the ID from the URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
- The `{SPREADSHEET_ID}` portion is what you need

**Example:**

```
"1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t"
```

---

### `sheetRange` (Required)

**Type:** `string`  
**Description:** Specifies which data to read using A1 notation. Format: `{SheetName}!{Start}:{End}`

**Format Components:**

- **SheetName:** The name of the sheet tab (case-sensitive)
- **Start:** Starting cell (e.g., `A1`, `B2`)
- **End:** Ending cell (e.g., `Z100`, `H50`)
- **!:** Separator between sheet name and range

**Range Examples:**

| Range                 | Description                                              |
| --------------------- | -------------------------------------------------------- |
| `PHASE_0!A2:I100`     | Read from sheet "PHASE_0", columns A-I, rows 2-100       |
| `Teams!A1:F50`        | Read from sheet "Teams", all columns A-F, rows 1-50      |
| `Results!A:Z`         | Read all rows in sheet "Results", columns A-Z            |
| `Scores!B3:E3`        | Read single row (row 3), columns B-E from "Scores" sheet |
| `Data!A1`             | Read single cell A1 from "Data" sheet                    |
| `2025-06-07!A1:Z1000` | Read entire dataset from sheet named "2025-06-07"        |

---

### `apiKey` (CRITICAL - Most Important)

**Type:** `string`  
**Default:** `import.meta.env.VITE_GOOGLE_API_KEY`  
**Description:** Your Google API key for authenticating requests to Google Sheets API. **Without this, the function cannot access any sheets.**

**Why it's critical:**

- ✅ **Enables authentication** - Proves your app has permission to access sheets
- ✅ **Required for API calls** - Every request to Google Sheets API must include this
- ✅ **Access control** - Determines which sheets you can read
- ✅ **Rate limiting** - API tracks usage per key
- ❌ **Missing/Invalid key** → All requests fail with 401 Unauthorized

**How to get your API key:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable "Google Sheets API"
4. Create an API key (Credentials → Create Credentials → API Key)
5. Copy the key to your `.env` file

**Setting up the environment variable:**

```env
# .env file
VITE_GOOGLE_API_KEY=AIzaSyA_your_actual_api_key_here_1234567890
```

**Using the API key:**

```typescript
// ✅ RECOMMENDED: Uses environment variable automatically
await readSheet("sheet-id-123", "Sheet1!A1:Z100");

// ✅ ALTERNATIVE: Pass key explicitly (if using different key)
await readSheet("sheet-id-123", "Sheet1!A1:Z100", "AIzaSyA_your_api_key");

// ❌ FAILS: No API key provided (defaults to undefined if env var not set)
await readSheet("sheet-id-123", "Sheet1!A1:Z100");
// → Error: "API key not provided"
```

**⚠️ CRITICAL Security Configuration:**

Your API key **WILL BE VISIBLE** in your frontend source code. You MUST properly restrict it:

### Step 1: Restrict to Google Sheets API Only
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your API key
4. Under **API restrictions**, select **Restrict key**
5. Choose **Google Sheets API** from the dropdown
6. Click **Save**

⚠️ **Critical:** Without this, the key can be used to access any Google API, not just Sheets!

### Step 2: Restrict by HTTP Referrer (Most Important)
1. In the same API key settings page, find **Application restrictions**
2. Select **HTTP referrers (web sites)**
3. Add your application URL(s):
   - Local development: `http://localhost:5173/*`
   - Production: `https://yourdomain.com/*`
   - Include all variants your app uses

⚠️ **Critical:** Only add YOUR application URLs. Anyone else with the key cannot use it from different domains.

### Example Referrer Configuration:
```
http://localhost:5173/*
http://localhost:3000/*
https://tournament.yourdomain.com/*
https://yourdomain.com/*
```

**Important Security Notes:**

- 🔒 Never commit API keys to version control
- 🔒 Use environment variables only
- 🔒 **ALWAYS restrict to Google Sheets API only** (prevents key misuse)
- 🔒 **ALWAYS restrict to your domain(s) via HTTP referrers** (frontend keys are exposed)
- 🔒 Regenerate keys immediately if compromised
- 🔒 Audit your referrer restrictions monthly
- 🔒 Keep application URLs updated as you scale

**What happens if not restricted:**
- ❌ Anyone finding your key can access all your Google APIs
- ❌ Someone could create massive costs using your key
- ❌ Your key could be exploited in attack campaigns

---

## Return Type

### `SheetData` Interface

```typescript
export interface SheetData {
	values: string[][]; // 2D array of cell values
	range: string; // The actual range that was read
}
```

**Response Structure:**

```typescript
{
  values: [
    ["Header1", "Header2", "Header3"],
    ["Value1", "Value2", "Value3"],
    ["Value4", "Value5", "Value6"]
  ],
  range: "Sheet1!A1:C3"
}
```

---

## Error Handling

The function returns a rejected promise if:

- `spreadsheetId` is empty or falsy
- `sheetRange` is empty or falsy
- Google API authentication fails
- The sheet or range doesn't exist
- Network request fails

**Error Handling Example:**

```typescript
try {
	const data = await readSheet(spreadsheetId, "PHASE_0!A1:Z100");
	console.log("Successfully read", data.values.length, "rows");
} catch (error) {
	console.error("Failed to read sheet:", error);
	// Handle error (show user message, use fallback data, etc.)
}
```

---

## Usage Examples

### Example 1: Reading Tournament Scores

```typescript
import { readSheet } from "./lib/scoreController";

const fetchTournamentScores = async (phaseNumber: number) => {
	try {
		const sheetName = `PHASE_${phaseNumber}`;
		const response = await readSheet(
			"1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t", // Your spreadsheet ID
			`${sheetName}!A2:I100`, // Read from row 2 to 100 (skip header), columns A-I
		);

		return response.values; // [["Team1", "90"], ["Team2", "85"], ...]
	} catch (error) {
		console.error("Could not fetch scores:", error);
		return [];
	}
};
```

### Example 2: Reading Team Registration Data

```typescript
const fetchTeamData = async () => {
	try {
		const response = await readSheet(
			process.env.REGISTRATION_SHEET_ID,
			"Teams!A1:G500", // Read all team data from columns A-G, up to row 500
		);

		const headers = response.values[0]; // First row is headers
		const teams = response.values.slice(1); // Remaining rows are team data

		console.log(`Found ${teams.length} teams`);
		return { headers, teams };
	} catch (error) {
		console.error("Failed to load team data:", error);
		return { headers: [], teams: [] };
	}
};
```

### Example 3: Reading a Single Row

```typescript
const fetchPhaseResults = async (phaseName: string) => {
	try {
		const response = await readSheet(
			"1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t",
			`${phaseName}!A1:Z1`, // Read only the first row (headers or summary)
		);

		return response.values[0]; // Returns array of values: ["Result1", "Result2", ...]
	} catch (error) {
		console.error("Could not fetch phase results:", error);
		return [];
	}
};
```

### Example 4: Reading a Single Cell

```typescript
const fetchLatestUpdate = async () => {
	try {
		const response = await readSheet(
			"1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t",
			"Settings!B1", // Read just cell B1 from "Settings" sheet
		);

		return response.values[0]?.[0]; // Returns single value
	} catch (error) {
		console.error("Could not fetch update:", error);
		return null;
	}
};
```

### Example 5: Using in React Component with useQuery

```typescript
import { useQuery } from "@tanstack/react-query";
import { readSheet } from "./lib/scoreController";

export function ScoresDisplay({ phaseNumber }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["scores", phaseNumber],
    queryFn: () => readSheet(
      process.env.VITE_SCORES_SHEET_ID,
      `PHASE_${phaseNumber}!A2:I100`
    ),
    refetchInterval: 60000,  // Refetch every 60 seconds
  });

  if (isLoading) return <div>Loading scores...</div>;
  if (error) return <div>Error loading scores</div>;

  return (
    <div>
      {data?.values.map((row, idx) => (
        <div key={idx}>{row.join(" - ")}</div>
      ))}
    </div>
  );
}
```

### Example 6: Reading Multiple Sheets

```typescript
const fetchAllCategoryData = async () => {
	try {
		const [juniorResponse, seniorResponse] = await Promise.all([
			readSheet(
				"1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t",
				"Junior!A1:Z1000",
			),
			readSheet(
				"1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t",
				"Senior!A1:Z1000",
			),
		]);

		return {
			junior: juniorResponse.values,
			senior: seniorResponse.values,
		};
	} catch (error) {
		console.error("Failed to fetch category data:", error);
		return { junior: [], senior: [] };
	}
};
```

### Example 7: Dynamic Range Based on Parameters

```typescript
const fetchSheetData = async (
	sheetName: string,
	startRow: number,
	endRow: number,
	startCol: string = "A",
	endCol: string = "Z",
) => {
	try {
		const range = `${sheetName}!${startCol}${startRow}:${endCol}${endRow}`;

		const response = await readSheet(
			"1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t",
			range,
		);

		return response.values;
	} catch (error) {
		console.error(`Failed to read ${range}:`, error);
		return [];
	}
};

// Usage:
const scores = await fetchSheetData("Scores", 2, 100); // Rows 2-100, columns A-Z
const teams = await fetchSheetData("Teams", 1, 50, "A", "F"); // A1:F50
```

---

## Integration with App.tsx

### Current Usage Pattern

```typescript
import { readSheet } from "./lib/scoreController";

// In your query function:
const fetchData = async () => {
	try {
		const juniorData = await readSheet(
			import.meta.env.VITE_JUNIOR_SPREADSHEET_ID,
			`${phase.sheetName}!A2:I100`,
		);

		const seniorData = await readSheet(
			import.meta.env.VITE_SENIOR_SPREADSHEET_ID,
			`${phase.sheetName}!A2:I100`,
		);

		return {
			junior: juniorData.values,
			senior: seniorData.values,
		};
	} catch (error) {
		console.error("Error fetching data:", error);
		setCurrentPhase(0);
		throw error;
	}
};
```

---

## Best Practices

### 1. **Store Spreadsheet IDs in Environment Variables**

```typescript
// ✅ Good
const sheetId = import.meta.env.VITE_JUNIOR_SPREADSHEET_ID;

// ❌ Avoid
const sheetId = "1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t";
```

### 2. **Use Descriptive Range Names**

```typescript
// ✅ Clear
const response = await readSheet(sheetId, "Scores!A2:I100");

// ❌ Unclear
const response = await readSheet(sheetId, "Sheet1!A:Z");
```

### 3. **Handle Errors Gracefully**

```typescript
// ✅ Good
try {
	const data = await readSheet(sheetId, range);
	return data;
} catch (error) {
	console.error("Error:", error);
	return { values: [], range };
}

// ❌ Avoid
const data = await readSheet(sheetId, range); // No error handling
```

### 4. **Cache Results When Appropriate**

```typescript
// Use React Query or similar
useQuery({
	queryKey: ["sheet-data", sheetId, range],
	queryFn: () => readSheet(sheetId, range),
	staleTime: 5 * 60 * 1000, // 5 minutes
	gcTime: 10 * 60 * 1000, // 10 minutes
});
```

### 5. **Validate Data Structure**

```typescript
const response = await readSheet(sheetId, "Data!A1:Z100");

if (!response.values || response.values.length === 0) {
	console.warn("No data returned from sheet");
	return [];
}

const [headers, ...rows] = response.values;
```

---

## Common Patterns

### Reading with Headers

```typescript
const response = await readSheet(sheetId, "Data!A1:Z1000");
const [headers, ...data] = response.values;

const result = data.map((row) => ({
	name: row[0],
	score: row[1],
	team: row[2],
}));
```

### Reading Specific Columns

```typescript
const response = await readSheet(sheetId, "Data!A1:D100");
// Only columns A, B, C, D are included
```

### Reading All Data in a Sheet

```typescript
const response = await readSheet(sheetId, "Data!A:Z");
// Reads all rows across columns A-Z (limit by Z to avoid empty columns)
```

---

## Troubleshooting

| Issue                           | Solution                                              |
| ------------------------------- | ----------------------------------------------------- |
| **"Empty range returned"**      | Check sheet name spelling and range syntax            |
| **"API authentication failed"** | Verify `VITE_GOOGLE_API_KEY` in `.env` file           |
| **"Sheet not found"**           | Ensure sheet name matches exactly (case-sensitive)    |
| **"Range out of bounds"**       | The range exists but is empty or exceeds sheet bounds |
| **"401 Unauthorized"**          | Check API key permissions in Google Cloud Console     |

---

## Authentication & Environment Setup

### 🔐 This is the most critical step - API authentication

Without proper API key setup, **nothing works**. The API key is your authentication token for Google Sheets API.

### 📖 Official Google Setup Guide

**Before proceeding, follow Google's official quickstart guide:**

👉 **[Google Sheets API - JavaScript Quickstart](https://developers.google.com/workspace/sheets/api/quickstart/js)**

This guide covers:

- ✅ Creating a Google Cloud project
- ✅ Enabling the Google Sheets API
- ✅ Creating credentials (API Key)
- ✅ Setting up authentication
- ✅ Making your first API call

**Come back here after completing the Google guide with your API key.**

---

**Required `.env` file:**

```env
# CRITICAL: Google API Key (required for ALL sheet operations)
# Without this, readSheet() will fail on every call
VITE_GOOGLE_API_KEY=AIzaSyA_your_actual_api_key_here_1234567890ABC

# Your spreadsheet IDs (specify WHICH sheets to read)
VITE_JUNIOR_SPREADSHEET_ID=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t
VITE_SENIOR_SPREADSHEET_ID=9s8r7q6p5o4n3m2l1k0j9i8h7g6f5e4d3c2b1a0
```

**Getting your API Key:**

Follow the detailed steps in the [official Google Sheets API quickstart guide](https://developers.google.com/workspace/sheets/api/quickstart/js), which covers:

1. Creating a Google Cloud project
2. Enabling the Google Sheets API
3. Creating credentials (API Key)
4. Obtaining your API key

Once you have your API key from the Google guide, paste it into your `.env` file as shown above.

**Verify setup is correct:**

```typescript
// This will show you if your API key is loaded
console.log(import.meta.env.VITE_GOOGLE_API_KEY);
// Should print: AIzaSyA_your_api_key... (not undefined)

// Try a simple read
try {
	const result = await readSheet(
		import.meta.env.VITE_JUNIOR_SPREADSHEET_ID,
		"PHASE_0!A1:B1",
	);
	console.log("✅ API Key is valid!", result);
} catch (error) {
	console.error("❌ API Key setup failed:", error);
}
```

**Common API Key Issues:**

| Problem                                         | Solution                                                               |
| ----------------------------------------------- | ---------------------------------------------------------------------- |
| **API key undefined**                           | Check `.env` file exists and has `VITE_GOOGLE_API_KEY`                 |
| **401 Unauthorized**                            | API key is invalid or expired - regenerate in Google Cloud             |
| **403 Forbidden**                               | Google Sheets API not enabled in Google Cloud Console                  |
| **API key works locally but not in production** | API key restrictions may need adjustment (check referrer restrictions) |

---

## Summary

The `readSheet` API provides a clean, flexible interface for reading any data from your Google Sheets. Use it across your application for consistent, reliable sheet access.

**Key Points:**

- ✅ Works with any sheet and any range
- ✅ Simple promise-based interface
- ✅ Includes error handling
- ✅ Returns both data and range information
- ✅ Integrates seamlessly with React Query
