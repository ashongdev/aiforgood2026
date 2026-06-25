import { useState } from "react";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { defaultPasswordFor } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { LoadingSpinner } from "../components/LoadingSpinner";

function destFor(role: string | null): string {
	return role === "admin" ? "/admin"
		: role === "referee" ? "/referee"
		: role === "mc" ? "/mc"
		: "/scorekeeper";
}

export function ChangePasswordPage() {
	const { isLoading, user, role, profile, refreshProfile, signOut } = useAuth();
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [showPwd, setShowPwd] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	if (isLoading) {
		return (
			<div className="min-h-screen bg-editorial-bg flex items-center justify-center">
				<LoadingSpinner />
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace />;
	}

	if (profile && !profile.must_change_password) {
		return <Navigate to={destFor(role)} replace />;
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);

		if (password.length < 8) {
			setError("Password must be at least 8 characters long.");
			return;
		}
		if (password !== confirm) {
			setError("Passwords do not match.");
			return;
		}
		if (role && password.toLowerCase() === defaultPasswordFor(role)) {
			setError("Please choose a password other than the default one.");
			return;
		}

		setIsSubmitting(true);

		const { error: updateError } = await supabase.auth.updateUser({ password });
		if (updateError) {
			setIsSubmitting(false);
			setError(updateError.message);
			return;
		}

		const { error: rpcError } = await supabase.rpc("complete_password_change");
		if (rpcError) {
			setIsSubmitting(false);
			setError(rpcError.message);
			return;
		}

		await refreshProfile();
		setIsSubmitting(false);
		navigate(destFor(role), { replace: true });
	}

	return (
		<div className="min-h-screen bg-editorial-bg flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]">
			<div className="w-full max-w-sm">
				<div className="mb-8">
					<h1 className="text-3xl font-black uppercase tracking-widest text-editorial-ink">
						Set Your Password
					</h1>
					<div className="w-12 h-1 bg-editorial-gold mt-2 mb-3" />
					<p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
						{role ?? "Staff"} Account · First Sign-In
					</p>
				</div>

				<div className="border-2 border-editorial-ink bg-white p-6 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] space-y-4">
					<div className="flex items-start gap-2 bg-editorial-gold/10 border border-editorial-gold/40 px-3 py-2.5">
						<ShieldAlert size={15} className="shrink-0 mt-0.5 text-editorial-gold" />
						<p className="text-xs text-editorial-ink/80 leading-snug">
							You're signing in with a default password. Choose a new password to continue.
						</p>
					</div>

					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-1">
							<label
								htmlFor="new-password"
								className="block text-[11px] font-black uppercase tracking-widest text-editorial-ink"
							>
								New Password
							</label>
							<div className="relative">
								<input
									id="new-password"
									type={showPwd ? "text" : "password"}
									autoComplete="new-password"
									required
									minLength={8}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="w-full border-2 border-editorial-ink px-3 py-2 pr-10 text-sm font-medium text-editorial-ink bg-editorial-bg focus:outline-none focus:border-editorial-gold focus:bg-white transition-colors"
								/>
								<button
									type="button"
									onClick={() => setShowPwd((v) => !v)}
									className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-editorial-ink transition-colors"
									tabIndex={-1}
									aria-label={showPwd ? "Hide password" : "Show password"}
								>
									{showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
								</button>
							</div>
						</div>

						<div className="space-y-1">
							<label
								htmlFor="confirm-password"
								className="block text-[11px] font-black uppercase tracking-widest text-editorial-ink"
							>
								Confirm Password
							</label>
							<input
								id="confirm-password"
								type={showPwd ? "text" : "password"}
								autoComplete="new-password"
								required
								minLength={8}
								value={confirm}
								onChange={(e) => setConfirm(e.target.value)}
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
							{isSubmitting ? "Saving…" : "Save & Continue"}
						</button>
					</form>
				</div>

				<button
					onClick={() => void signOut()}
					className="mt-4 w-full text-center text-xs text-gray-400 underline hover:text-editorial-ink transition-colors"
				>
					Sign out
				</button>
			</div>
		</div>
	);
}
