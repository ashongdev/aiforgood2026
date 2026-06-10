import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import "./index.css";
import { LoginPage } from "./pages/LoginPage.tsx";
import { ProtectedRoute } from "./components/auth/ProtectedRoute.tsx";
import { ScorekeeperPage } from "./pages/ScorekeeperPage.tsx";
import { AdminPage } from "./pages/AdminPage.tsx";
import { RefereePage } from "./pages/RefereePage.tsx";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
	<QueryClientProvider client={queryClient}>
		<BrowserRouter>
			<AuthProvider>
				<Routes>
					{/* Public spectator view */}
					<Route path="/" element={<App />} />

					{/* Auth */}
					<Route path="/login" element={<LoginPage />} />

					{/* Scorekeeper grid — requires 'scorekeeper' or 'admin' role */}
					<Route
						path="/scorekeeper"
						element={
							<ProtectedRoute allowedRoles={["scorekeeper", "admin"]}>
								<ScorekeeperPage />
							</ProtectedRoute>
						}
					/>

					{/* Referee mobile entry — requires 'referee' or 'admin' role */}
					<Route
						path="/referee"
						element={
							<ProtectedRoute allowedRoles={["referee", "admin"]}>
								<RefereePage />
							</ProtectedRoute>
						}
					/>

					{/* Admin dashboard — requires 'admin' role */}
					<Route
						path="/admin"
						element={
							<ProtectedRoute allowedRoles={["admin"]}>
								<AdminPage />
							</ProtectedRoute>
						}
					/>
				</Routes>
			</AuthProvider>
		</BrowserRouter>
	</QueryClientProvider>,
);
