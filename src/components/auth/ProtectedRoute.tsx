import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import type { Role } from "../../lib/database.types";
import { LoadingSpinner } from "../LoadingSpinner";

interface ProtectedRouteProps {
	allowedRoles: Role[];
	children: React.ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
	const { isLoading, role } = useAuth();

	if (isLoading) {
		return (
			<div className="min-h-screen bg-editorial-bg flex items-center justify-center">
				<LoadingSpinner />
			</div>
		);
	}

	if (!role) {
		return <Navigate to="/login" replace />;
	}

	if (!allowedRoles.includes(role)) {
		// Logged in but wrong role — send to their default destination
		const dest = role === "admin" ? "/admin" : "/scorekeeper";
		return <Navigate to={dest} replace />;
	}

	return <>{children}</>;
}
