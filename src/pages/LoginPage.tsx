import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function LoginPage() {
	const { signIn, role, isLoading } = useAuth();
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Redirect if already logged in
	if (!isLoading && role) {
		const dest = role === "admin" ? "/admin" : "/scorekeeper";
		navigate(dest, { replace: true });
		return null;
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setIsSubmitting(true);

		const { error: signInError } = await signIn(email.trim(), password);
		setIsSubmitting(false);

		if (signInError) {
			setError(signInError);
			return;
		}

		// onAuthStateChange in AuthProvider will update role;
		// navigate once profile is loaded (handled below via role effect)
	}

	// Navigate after role loads post-login
	if (!isLoading && role && !isSubmitting) {
		const dest = role === "admin" ? "/admin" : "/scorekeeper";
		navigate(dest, { replace: true });
	}

	return (
		<div className="min-h-screen bg-editorial-bg flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]">
			<div className="w-full max-w-sm">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl font-black uppercase tracking-widest text-editorial-ink">
						Tournament
					</h1>
					<div className="w-12 h-1 bg-editorial-gold mt-2 mb-3" />
					<p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
						Staff Sign-In
					</p>
				</div>

				{/* Form */}
				<form
					onSubmit={handleSubmit}
					className="border-2 border-editorial-ink bg-white p-6 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] space-y-4"
				>
					<div className="space-y-1">
						<label
							htmlFor="email"
							className="block text-[11px] font-black uppercase tracking-widest text-editorial-ink"
						>
							Email
						</label>
						<input
							id="email"
							type="email"
							autoComplete="username"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="w-full border-2 border-editorial-ink px-3 py-2 text-sm font-medium text-editorial-ink bg-editorial-bg focus:outline-none focus:border-editorial-gold focus:bg-white transition-colors"
							placeholder="scorer@tournament.org"
						/>
					</div>

					<div className="space-y-1">
						<label
							htmlFor="password"
							className="block text-[11px] font-black uppercase tracking-widest text-editorial-ink"
						>
							Password
						</label>
						<input
							id="password"
							type="password"
							autoComplete="current-password"
							required
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full border-2 border-editorial-ink px-3 py-2 text-sm font-medium text-editorial-ink bg-editorial-bg focus:outline-none focus:border-editorial-gold focus:bg-white transition-colors"
						/>
					</div>

					{error && (
						<p className="text-xs font-semibold text-red-600 border border-red-200 bg-red-50 px-3 py-2">
							{error}
						</p>
					)}

					<button
						type="submit"
						disabled={isSubmitting}
						className="w-full border-2 border-editorial-ink bg-editorial-ink text-white py-2.5 text-sm font-black uppercase tracking-widest hover:bg-editorial-gold hover:text-editorial-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[3px_3px_0px_0px_rgba(212,175,55,1)]"
					>
						{isSubmitting ? "Signing in…" : "Sign In"}
					</button>
				</form>

				<p className="mt-4 text-center text-xs text-gray-400">
					<a
						href="/"
						className="underline hover:text-editorial-ink transition-colors"
					>
						← Back to spectator view
					</a>
				</p>
			</div>
		</div>
	);
}
