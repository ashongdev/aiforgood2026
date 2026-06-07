import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface UseEdgeColumnResizeOptions {
	columnCount: number;
	minColumnWidth?: number;
	edgeThreshold?: number;
}

interface DragState {
	columnIndex: number;
	startX: number;
	startWidth: number;
}

export function useEdgeColumnResize({
	columnCount,
	minColumnWidth = 56,
	edgeThreshold = 6,
}: UseEdgeColumnResizeOptions) {
	const tableRef = useRef<HTMLTableElement | null>(null);
	const dragRef = useRef<DragState | null>(null);
	const moveHandlerRef = useRef<(event: MouseEvent) => void>(() => {});
	const upHandlerRef = useRef<(event: MouseEvent) => void>(() => {});
	const [widths, setWidths] = useState<Array<number | null>>(
		() => Array.from({ length: columnCount }, () => null),
	);
	const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);

	useEffect(() => {
		setWidths((prev) => {
			const next = Array.from({ length: columnCount }, (_, i) => prev[i] ?? null);
			return next;
		});
	}, [columnCount]);

	const setResizeCursor = useCallback((enabled: boolean) => {
		if (!tableRef.current) return;
		tableRef.current.style.cursor = enabled ? "col-resize" : "";
	}, []);

	const getEdgeColumnFromEvent = useCallback(
		(event: React.MouseEvent<HTMLTableElement>) => {
			if (!tableRef.current) return null;
			const target = event.target as HTMLElement;
			const cell = target.closest("th,td") as HTMLTableCellElement | null;
			if (!cell || !tableRef.current.contains(cell)) return null;

			const rect = cell.getBoundingClientRect();
			const nearRight = Math.abs(event.clientX - rect.right) <= edgeThreshold;
			if (nearRight) {
				return Math.min(cell.cellIndex, columnCount - 1);
			}

			const nearLeft = Math.abs(event.clientX - rect.left) <= edgeThreshold;
			if (nearLeft && cell.cellIndex > 0) {
				return Math.min(cell.cellIndex - 1, columnCount - 1);
			}

			return null;
		},
		[columnCount, edgeThreshold],
	);

	const stopDragging = useCallback(() => {
		dragRef.current = null;
		document.body.style.userSelect = "";
		document.body.style.cursor = "";
		window.removeEventListener("mousemove", moveHandlerRef.current);
		window.removeEventListener("mouseup", upHandlerRef.current);
		setResizeCursor(false);
	}, [setResizeCursor]);

	useEffect(() => {
		return () => {
			stopDragging();
		};
	}, [stopDragging]);

	const onMouseMove = useCallback(
		(event: React.MouseEvent<HTMLTableElement>) => {
			if (dragRef.current) return;

			const edgeColumn = getEdgeColumnFromEvent(event);
			setHoveredColumn(edgeColumn);
			setResizeCursor(edgeColumn !== null);
		},
		[getEdgeColumnFromEvent, setResizeCursor],
	);

	const onMouseLeave = useCallback(() => {
		if (dragRef.current) return;
		setHoveredColumn(null);
		setResizeCursor(false);
	}, [setResizeCursor]);

	const onMouseDown = useCallback(
		(event: React.MouseEvent<HTMLTableElement>) => {
			if (event.button !== 0 || !tableRef.current) return;
			const edgeColumn = getEdgeColumnFromEvent(event);
			if (edgeColumn === null) return;

			event.preventDefault();

			const sampleRow = tableRef.current.querySelector("tr");
			const sampleCell = sampleRow?.children.item(edgeColumn) as HTMLElement | null;
			const measuredWidth = sampleCell?.getBoundingClientRect().width ?? minColumnWidth;
			const startWidth = widths[edgeColumn] ?? measuredWidth;

			dragRef.current = {
				columnIndex: edgeColumn,
				startX: event.clientX,
				startWidth,
			};
			setHoveredColumn(edgeColumn);
			document.body.style.userSelect = "none";
			document.body.style.cursor = "col-resize";
			setResizeCursor(true);

			moveHandlerRef.current = (moveEvent: MouseEvent) => {
				const dragState = dragRef.current;
				if (!dragState) return;
				const deltaX = moveEvent.clientX - dragState.startX;
				const nextWidth = Math.max(
					minColumnWidth,
					Math.round(dragState.startWidth + deltaX),
				);
				setWidths((prev) => {
					if (prev[dragState.columnIndex] === nextWidth) return prev;
					const next = [...prev];
					next[dragState.columnIndex] = nextWidth;
					return next;
				});
			};

			upHandlerRef.current = () => {
				stopDragging();
			};

			window.addEventListener("mousemove", moveHandlerRef.current);
			window.addEventListener("mouseup", upHandlerRef.current);
		},
		[
			getEdgeColumnFromEvent,
			minColumnWidth,
			setResizeCursor,
			stopDragging,
			widths,
		],
	);

	const getColumnStyle = useCallback(
		(columnIndex: number): React.CSSProperties | undefined => {
			const width = widths[columnIndex];
			if (width === null) return undefined;
			return { width: `${width}px`, minWidth: `${minColumnWidth}px` };
		},
		[minColumnWidth, widths],
	);

	const tableProps = useMemo(
		() => ({
			ref: tableRef,
			onMouseMove,
			onMouseLeave,
			onMouseDown,
		}),
		[onMouseDown, onMouseLeave, onMouseMove],
	);

	return {
		tableProps,
		hoveredColumn,
		getColumnStyle,
	};
}