export interface SheetData {
	values: string[][];
	range: string;
}

export async function readSheet(
	spreadsheetId: string,
	sheetRange: string,
	apiKey: string = import.meta.env.VITE_GOOGLE_API_KEY,
): Promise<SheetData> {
	if (!spreadsheetId || !sheetRange) {
		return { values: [], range: sheetRange };
	}

	return new Promise<SheetData>((resolve, reject) => {
		gapi.load("client", () => {
			gapi.client
				.init({
					apiKey,
					discoveryDocs: [
						"https://sheets.googleapis.com/$discovery/rest?version=v4",
					],
				})
				.then(() => {
					return (gapi.client as any).sheets.spreadsheets.values.get({
						spreadsheetId,
						range: sheetRange,
						valueRenderOption: "FORMATTED_VALUE",
					});
				})
				.then((response: any) => {
					const values = response.result?.values || [];
					resolve({
						values,
						range: response.result?.range || sheetRange,
					});
				})
				.catch((err: any) => {
					console.error("Error reading sheet:", err);
					reject(err);
				});
		});
	});
}
