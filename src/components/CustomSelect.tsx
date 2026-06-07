import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface SelectOption {
	value: string;
	label: string;
}

interface CustomSelectProps {
	value: string;
	options: SelectOption[];
	onChange: (value: string) => void;
	/** Shown when value is empty string */
	placeholder?: string;
	/**
	 * "light" — white panel trigger; turns gold when a non-default value is active.
	 * "dark"  — for dark backgrounds (e.g. scorekeeper topbar); trigger stays dark,
	 *            dropdown panel is always white.
	 */
	theme?: "light" | "dark";
	/**
	 * Show the search input inside the dropdown.
	 * Defaults to true when there are more than 5 options.
	 */
	showSearch?: boolean;
	/**
	 * The value that is considered "unselected / default".
	 * When provided and value !== defaultValue, the trigger turns gold (light theme only).
	 */
	defaultValue?: string;
	className?: string;
}

export function CustomSelect({
	value,
	options,
	onChange,
	placeholder = "Select…",
	theme = "light",
	showSearch,
	defaultValue,
	className = "",
}: CustomSelectProps) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const shouldShowSearch = showSearch ?? options.length > 5;
	const isActive =
		theme === "light" && defaultValue !== undefined && value !== defaultValue;

	const selectedLabel =
		options.find((o) => o.value === value)?.label ?? placeholder;

	const filtered = query
		? options.filter(
				(o) =>
					o.label.toLowerCase().includes(query.toLowerCase()) ||
					o.value.toLowerCase().includes(query.toLowerCase()),
			)
		: options;

	useEffect(() => {
		function onOutsideClick(e: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setOpen(false);
				setQuery("");
			}
		}
		document.addEventListener("mousedown", onOutsideClick);
		return () => document.removeEventListener("mousedown", onOutsideClick);
	}, []);

	// Trigger styles
	const triggerBase =
		"flex items-center gap-1.5 px-2 h-[30px] text-xs font-semibold focus:outline-none cursor-pointer transition-colors w-full text-left";

	const triggerTheme =
		theme === "dark"
			? "border border-white/30 bg-white/10 text-white hover:border-white/50"
			: isActive
				? "border border-editorial-gold bg-editorial-gold/5 text-editorial-ink"
				: "border border-gray-200 bg-white text-editorial-ink hover:border-gray-300";

	const chevronClass =
		theme === "dark" ? "text-white/60" : "text-gray-400";

	return (
		<div ref={containerRef} className={`relative ${className}`}>
			<button
				type="button"
				onClick={() => {
					const next = !open;
					setOpen(next);
					if (next && shouldShowSearch) {
						setTimeout(() => inputRef.current?.focus(), 0);
					}
				}}
				className={`${triggerBase} ${triggerTheme}`}
			>
				<span className="flex-1 truncate">{selectedLabel}</span>
				{/* Clear button — light theme only, when a non-placeholder value is active */}
				{theme === "light" && isActive && (
					<span
						role="button"
						onClick={(e) => {
							e.stopPropagation();
							onChange(defaultValue!);
							setOpen(false);
						}}
						className="text-gray-400 hover:text-gray-700 font-black text-[10px] leading-none px-0.5 shrink-0"
					>
						✕
					</span>
				)}
				<ChevronDown
					size={11}
					className={`shrink-0 transition-transform ${open ? "rotate-180" : ""} ${chevronClass}`}
				/>
			</button>

			{open && (
				<div className="absolute top-full left-0 z-50 w-full min-w-40 bg-white border border-gray-200 shadow-lg mt-0.5">
					{shouldShowSearch && (
						<div className="p-1.5 border-b border-gray-100">
							<input
								ref={inputRef}
								type="text"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Search…"
								className="w-full text-xs px-2 py-1 focus:outline-none border border-gray-200 focus:border-editorial-gold text-editorial-ink placeholder:text-gray-300"
							/>
						</div>
					)}
					<div className="max-h-52 overflow-y-auto">
						{filtered.length === 0 ? (
							<p className="px-3 py-2 text-xs text-gray-400">
								No matches
							</p>
						) : (
							filtered.map((opt) => (
								<button
									key={opt.value}
									type="button"
									onClick={() => {
										onChange(opt.value);
										setOpen(false);
										setQuery("");
									}}
									className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-editorial-gold/10 ${
										value === opt.value
											? "bg-editorial-gold/10 font-semibold text-editorial-ink"
											: "text-editorial-ink"
									}`}
								>
									{opt.label}
								</button>
							))
						)}
					</div>
				</div>
			)}
		</div>
	);
}
